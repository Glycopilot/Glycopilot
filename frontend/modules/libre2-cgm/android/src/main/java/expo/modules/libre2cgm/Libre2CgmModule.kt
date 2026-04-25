package expo.modules.libre2cgm

import android.os.Bundle
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.libre2cgm.ble.BleClient
import expo.modules.libre2cgm.ble.Libre2ForegroundService
import expo.modules.libre2cgm.model.GlucosePacket
import expo.modules.libre2cgm.model.GlucoseReading
import expo.modules.libre2cgm.nfc.NfcActivator
import expo.modules.libre2cgm.nfc.NfcSession
import java.util.concurrent.atomic.AtomicReference

class Libre2CgmModule : Module() {

    private val nfcSession = NfcSession()
    private val pendingActivation = AtomicReference<PendingActivation?>(null)
    private val activator = NfcActivator()

    private var bleClient: BleClient? = null

    override fun definition() = ModuleDefinition {
        Name("Libre2Cgm")

        Events(
            EVENT_SENSOR_ACTIVATED,
            EVENT_SENSOR_ACTIVATION_FAILED,
            EVENT_GLUCOSE_READING,
            EVENT_BLE_STATE,
            EVENT_BLE_ERROR,
        )

        Function("hello") {
            "Hello from Libre2Cgm native module!"
        }

        // ===== NFC activation ===============================================

        AsyncFunction("startActivation") { unlockCount: Int, promise: Promise ->
            val activity = appContext.activityProvider?.currentActivity
                ?: throw Exceptions.MissingActivity()
            if (pendingActivation.get() != null) {
                promise.reject("ERR_ACTIVATION_BUSY", "An activation is already in progress", null)
                return@AsyncFunction
            }
            pendingActivation.set(PendingActivation(unlockCount, promise))
            activity.runOnUiThread {
                nfcSession.start(activity) { tag ->
                    val pending = pendingActivation.getAndSet(null) ?: return@start
                    try {
                        val result = activator.activate(tag, pending.unlockCount)
                        val payload = Bundle().apply {
                            putString("uid", result.uid.toHex())
                            putString("patchInfo", result.patchInfo.toHex())
                            putString("mac", result.macFormatted())
                            putString("serial", result.serial)
                            putInt("unlockCount", result.unlockCount)
                        }
                        sendEvent(EVENT_SENSOR_ACTIVATED, payload)
                        pending.promise.resolve(payload)
                    } catch (e: Throwable) {
                        val errorBundle = Bundle().apply {
                            putString("code", e.javaClass.simpleName)
                            putString("message", e.message ?: "unknown")
                        }
                        sendEvent(EVENT_SENSOR_ACTIVATION_FAILED, errorBundle)
                        pending.promise.reject("ERR_ACTIVATION_FAILED", e.message ?: "unknown", e)
                    } finally {
                        activity.runOnUiThread { nfcSession.stop(activity) }
                    }
                }
            }
        }

        AsyncFunction("cancelActivation") { promise: Promise ->
            val activity = appContext.activityProvider?.currentActivity
            val pending = pendingActivation.getAndSet(null)
            if (activity != null) {
                activity.runOnUiThread { nfcSession.stop(activity) }
            }
            pending?.promise?.reject("ERR_ACTIVATION_CANCELLED", "Activation cancelled by JS", null)
            promise.resolve(null)
        }

        // ===== BLE streaming ================================================

        AsyncFunction("startBleSession") { sensor: Map<String, Any>, promise: Promise ->
            val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
            if (bleClient != null) {
                promise.reject("ERR_BLE_BUSY", "A BLE session is already running", null)
                return@AsyncFunction
            }
            val params = try {
                BleClient.SessionParams(
                    uid = (sensor["uid"] as String).hexToBytes(),
                    patchInfo = (sensor["patchInfo"] as String).hexToBytes(),
                    mac = sensor["mac"] as String,
                    unlockCount = (sensor["unlockCount"] as Number).toInt(),
                )
            } catch (e: Throwable) {
                promise.reject("ERR_INVALID_SENSOR", "Invalid sensor params: ${e.message}", e)
                return@AsyncFunction
            }
            val client = BleClient(ctx)
            bleClient = client
            Libre2ForegroundService.start(ctx)

            client.start(params, object : BleClient.Listener {
                override fun onState(state: BleClient.ConnectionState, info: String?) {
                    sendEvent(EVENT_BLE_STATE, Bundle().apply {
                        putString("state", state.name)
                        if (info != null) putString("info", info)
                    })
                }

                override fun onPacket(packet: GlucosePacket) {
                    sendEvent(EVENT_GLUCOSE_READING, packet.toBundle())
                }

                override fun onError(error: BleClient.BleError) {
                    sendEvent(EVENT_BLE_ERROR, Bundle().apply {
                        putString("code", error.javaClass.simpleName)
                        putString("message", error.message ?: "unknown")
                    })
                }
            })
            promise.resolve(null)
        }

        AsyncFunction("stopBleSession") { promise: Promise ->
            val ctx = appContext.reactContext
            bleClient?.stop()
            bleClient = null
            if (ctx != null) {
                Libre2ForegroundService.stop(ctx)
            }
            promise.resolve(null)
        }

        // ===== Lifecycle ====================================================

        OnNewIntent { intent ->
            nfcSession.handleNewIntent(intent)
        }

        OnActivityDestroys {
            val activity = appContext.activityProvider?.currentActivity
            if (activity != null) nfcSession.stop(activity)
            pendingActivation.getAndSet(null)?.promise?.reject(
                "ERR_ACTIVATION_CANCELLED",
                "Activity destroyed before activation completed",
                null,
            )
            bleClient?.stop()
            bleClient = null
            val ctx = appContext.reactContext
            if (ctx != null) Libre2ForegroundService.stop(ctx)
        }
    }

    private data class PendingActivation(val unlockCount: Int, val promise: Promise)

    // ----- byte/hex helpers --------------------------------------------------

    private fun ByteArray.toHex(): String =
        joinToString("") { "%02x".format(it.toInt() and 0xFF) }

    private fun String.hexToBytes(): ByteArray {
        val clean = if (startsWith("0x", ignoreCase = true)) substring(2) else this
        require(clean.length % 2 == 0) { "Invalid hex string length" }
        return ByteArray(clean.length / 2) { i ->
            ((Character.digit(clean[2 * i], 16) shl 4) or Character.digit(clean[2 * i + 1], 16)).toByte()
        }
    }

    private fun GlucoseReading.toBundle(): Bundle = Bundle().apply {
        putInt("rawGlucose", rawGlucose)
        putInt("rawTemperature", rawTemperature)
        putInt("temperatureAdjustment", temperatureAdjustment)
        putBoolean("hasError", hasError)
        if (mgdl.isNaN()) {
            // RN bundle has no Double NaN representation; omit and let JS treat as null.
        } else {
            putDouble("mgdl", mgdl)
            putDouble("mmol", mmol)
        }
        putString("kind", kind.name)
        putInt("ageMinutes", ageMinutes)
        putBoolean("isValid", isValid)
    }

    private fun GlucosePacket.toBundle(): Bundle = Bundle().apply {
        putBundle("current", current.toBundle())
        putParcelableArray("trend", trend.map { it.toBundle() }.toTypedArray())
        putParcelableArray("history", history.map { it.toBundle() }.toTypedArray())
        putInt("wearTimeMinutes", wearTimeMinutes)
    }

    companion object {
        private const val EVENT_SENSOR_ACTIVATED = "onSensorActivated"
        private const val EVENT_SENSOR_ACTIVATION_FAILED = "onSensorActivationFailed"
        private const val EVENT_GLUCOSE_READING = "onGlucoseReading"
        private const val EVENT_BLE_STATE = "onBleStateChanged"
        private const val EVENT_BLE_ERROR = "onBleError"
    }
}
