package expo.modules.libre2cgm.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import expo.modules.libre2cgm.crypto.BleDecryptor
import expo.modules.libre2cgm.crypto.UnlockPayload
import expo.modules.libre2cgm.model.GlucosePacket
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Libre 2 BLE client. Owns a single GATT connection at a time.
 *
 * Lifecycle:
 *   1. [start] — scan for the device matching the stored MAC (or `ABBOTT*` name).
 *   2. After discovery, connect, discover services, enable indications on F002.
 *   3. Write the streaming-unlock payload to F001 — sensor begins emitting indications.
 *   4. Buffer indications until 46 bytes accumulate, decrypt, parse, callback.
 *   5. [stop] — disconnect, close, release.
 *
 * `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` permissions must be granted by the
 * caller (Android 12+); we annotate `@SuppressLint("MissingPermission")` here
 * because the JS layer is responsible for the prompt.
 */
@SuppressLint("MissingPermission")
class BleClient(private val context: Context) {

    interface Listener {
        fun onState(state: ConnectionState, info: String? = null)
        fun onPacket(packet: GlucosePacket)
        fun onError(error: BleError)
    }

    enum class ConnectionState { IDLE, SCANNING, CONNECTING, CONNECTED, READY, DISCONNECTED }

    sealed class BleError(message: String) : Exception(message) {
        class BluetoothUnavailable : BleError("Bluetooth adapter unavailable or off")
        class ScanFailed(code: Int) : BleError("BLE scan failed (code=$code)")
        class ConnectionFailed(status: Int) : BleError("GATT connection failed (status=$status)")
        class ServiceMissing(uuid: String) : BleError("Required GATT service missing: $uuid")
        class CharacteristicMissing(uuid: String) : BleError("Required characteristic missing: $uuid")
        class WriteFailed(status: Int) : BleError("F001 write failed (status=$status)")
        class DecryptFailed(cause: Throwable) : BleError("Packet decrypt failed: ${cause.message}")
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val accumulator = PacketAccumulator()
    private val started = AtomicBoolean(false)

    private var listener: Listener? = null
    private var session: SessionParams? = null
    private var gatt: BluetoothGatt? = null

    data class SessionParams(
        val uid: ByteArray,
        val patchInfo: ByteArray,
        val mac: String,
        val unlockCount: Int,
    )

    fun start(params: SessionParams, listener: Listener) {
        if (!started.compareAndSet(false, true)) {
            listener.onError(IllegalStateException("BleClient already started").let {
                object : BleError("BleClient already started") {}
            })
            return
        }
        this.listener = listener
        this.session = params

        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter = manager?.adapter
        if (adapter == null || !adapter.isEnabled) {
            emitError(BleError.BluetoothUnavailable())
            release()
            return
        }
        emitState(ConnectionState.SCANNING, info = params.mac)
        startScan(adapter, params.mac)
    }

    fun stop() {
        try {
            gatt?.disconnect()
        } catch (_: Throwable) {}
        release()
    }

    // ----- scanning ----------------------------------------------------------

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            val device = result?.device ?: return
            if (!matchesSession(device, result)) return

            val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
            adapter?.bluetoothLeScanner?.stopScan(this)
            connect(device)
        }

        override fun onScanFailed(errorCode: Int) {
            emitError(BleError.ScanFailed(errorCode))
            release()
        }
    }

    private fun startScan(adapter: BluetoothAdapter, mac: String) {
        val scanner = adapter.bluetoothLeScanner ?: run {
            emitError(BleError.BluetoothUnavailable())
            release()
            return
        }
        val filters = listOf(
            ScanFilter.Builder().setDeviceAddress(mac).build(),
            ScanFilter.Builder()
                .setServiceUuid(ParcelUuid(BleConstants.SERVICE_UUID))
                .build(),
        )
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()
        scanner.startScan(filters, settings, scanCallback)
    }

    private fun matchesSession(device: BluetoothDevice, result: ScanResult): Boolean {
        val s = session ?: return false
        if (device.address.equals(s.mac, ignoreCase = true)) return true
        val name = device.name ?: result.scanRecord?.deviceName ?: return false
        return name.uppercase().startsWith(BleConstants.ADVERTISED_NAME_PREFIX)
    }

    // ----- connection --------------------------------------------------------

    private fun connect(device: BluetoothDevice) {
        emitState(ConnectionState.CONNECTING, info = device.address)
        val callback = gattCallback()
        gatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
        } else {
            device.connectGatt(context, false, callback)
        }
    }

    private fun gattCallback() = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                emitError(BleError.ConnectionFailed(status))
                release()
                return
            }
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    emitState(ConnectionState.CONNECTED)
                    g.discoverServices()
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    emitState(ConnectionState.DISCONNECTED)
                    release()
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                emitError(BleError.ConnectionFailed(status))
                release()
                return
            }
            val service = g.getService(BleConstants.SERVICE_UUID) ?: run {
                emitError(BleError.ServiceMissing(BleConstants.SERVICE_UUID.toString()))
                release()
                return
            }
            val notifyChar = service.getCharacteristic(BleConstants.NOTIFY_CHARACTERISTIC_UUID)
                ?: run {
                    emitError(BleError.CharacteristicMissing(BleConstants.NOTIFY_CHARACTERISTIC_UUID.toString()))
                    release()
                    return
                }
            g.setCharacteristicNotification(notifyChar, true)
            val cccd = notifyChar.getDescriptor(BleConstants.CCCD_UUID) ?: run {
                emitError(BleError.CharacteristicMissing(BleConstants.CCCD_UUID.toString()))
                release()
                return
            }
            cccd.value = BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
            g.writeDescriptor(cccd)
        }

        override fun onDescriptorWrite(g: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                emitError(BleError.WriteFailed(status))
                release()
                return
            }
            sendUnlockPayload(g)
        }

        override fun onCharacteristicWrite(
            g: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int,
        ) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                emitError(BleError.WriteFailed(status))
                release()
                return
            }
            emitState(ConnectionState.READY)
        }

        override fun onCharacteristicChanged(
            g: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
        ) {
            if (characteristic.uuid != BleConstants.NOTIFY_CHARACTERISTIC_UUID) return
            val data = characteristic.value ?: return
            handleIndication(data)
        }
    }

    private fun sendUnlockPayload(g: BluetoothGatt) {
        val s = session ?: return
        val service = g.getService(BleConstants.SERVICE_UUID) ?: return
        val writeChar = service.getCharacteristic(BleConstants.WRITE_CHARACTERISTIC_UUID) ?: run {
            emitError(BleError.CharacteristicMissing(BleConstants.WRITE_CHARACTERISTIC_UUID.toString()))
            release()
            return
        }
        val payload = UnlockPayload.streamingUnlockPayload(
            uid = s.uid,
            patchInfo = s.patchInfo,
            unlockCount = s.unlockCount,
        )
        writeChar.value = payload
        writeChar.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        if (!g.writeCharacteristic(writeChar)) {
            emitError(BleError.WriteFailed(-1))
            release()
        }
    }

    private fun handleIndication(chunk: ByteArray) {
        val s = session ?: return
        val full = accumulator.feed(chunk) ?: return
        try {
            val plain = BleDecryptor.decrypt(s.uid, full)
            val packet = GlucosePacket.parse(plain)
            mainHandler.post { listener?.onPacket(packet) }
        } catch (e: Throwable) {
            Log.w(TAG, "decrypt/parse failed", e)
            emitError(BleError.DecryptFailed(e))
            // Don't release: a single bad packet should not tear down the session.
        }
    }

    // ----- helpers -----------------------------------------------------------

    private fun emitState(state: ConnectionState, info: String? = null) {
        mainHandler.post { listener?.onState(state, info) }
    }

    private fun emitError(error: BleError) {
        mainHandler.post { listener?.onError(error) }
    }

    private fun release() {
        try {
            gatt?.close()
        } catch (_: Throwable) {}
        gatt = null
        accumulator.reset()
        started.set(false)
    }

    companion object {
        private const val TAG = "Libre2BleClient"
    }
}
