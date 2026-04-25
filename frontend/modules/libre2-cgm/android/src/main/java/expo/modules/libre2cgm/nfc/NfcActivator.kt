package expo.modules.libre2cgm.nfc

import android.nfc.Tag
import android.nfc.tech.NfcV
import expo.modules.libre2cgm.crypto.SerialDecoder
import expo.modules.libre2cgm.crypto.UnlockPayload
import expo.modules.libre2cgm.model.SensorActivation
import java.io.IOException

/**
 * Drives the FreeStyle Libre 2 (non-Plus) ISO-15693 activation sequence.
 *
 * High-level flow:
 *   1. Connect NfcV.
 *   2. GetPatchInfo (custom command 0xA1) → 6-byte patch info, identifies the sensor type.
 *   3. Build streamingUnlockPayload using UID, patchInfo and the persisted unlockCount.
 *   4. Send activation frame (custom command 0xA1 with 0x1E subcommand + payload).
 *   5. Parse the response → 6-byte BLE MAC (returned reversed).
 *   6. Persist {uid, patchInfo, mac, unlockCount + 1}; return [SensorActivation].
 */
class NfcActivator {

    sealed class ActivationException(message: String, cause: Throwable? = null) :
        Exception(message, cause) {
        class NotALibreSensor(uid: ByteArray) :
            ActivationException("Not a Libre sensor (manufacturer = 0x%02X, expected 0x07)".format(uid[6]))
        class TransceiveFailed(stage: String, cause: Throwable) :
            ActivationException("NFC transceive failed at stage \"$stage\"", cause)
        class SensorRejected(stage: String, status: Int) :
            ActivationException("Sensor rejected stage \"$stage\" with status 0x%02X".format(status))
        class UnexpectedResponseLength(stage: String, expected: Int, got: Int) :
            ActivationException("Unexpected response length at \"$stage\": expected $expected, got $got")
    }

    /**
     * Run the full activation sequence on the given tag.
     * Caller is responsible for getting [tag] from the NFC foreground dispatch.
     *
     * @param unlockCount the next unlock counter to use (must be persisted by caller).
     */
    @Throws(ActivationException::class)
    fun activate(tag: Tag, unlockCount: Int): SensorActivation {
        val nfcV = NfcV.get(tag) ?: throw ActivationException.TransceiveFailed(
            "open",
            IOException("Tag does not expose NfcV (ISO-15693)")
        )

        // 8-byte UID, returned by Android in MSB-first order; reverse to LSB-first
        // because the Libre protocol manipulates the UID in transmission order.
        val uidLsbFirst = ByteArray(8).also {
            for (i in 0..7) it[i] = tag.id[7 - i]
        }
        if ((uidLsbFirst[6].toInt() and 0xFF) != MANUFACTURER_ABBOTT) {
            throw ActivationException.NotALibreSensor(uidLsbFirst)
        }

        try {
            nfcV.connect()
            nfcV.transceiveTimeout = TRANSCEIVE_TIMEOUT_MS

            val patchInfo = getPatchInfo(nfcV, uidLsbFirst)
            if (patchInfo.size < 6) {
                throw ActivationException.UnexpectedResponseLength(
                    "getPatchInfo", expected = 6, got = patchInfo.size
                )
            }

            val mac = enableBleStreaming(nfcV, uidLsbFirst, patchInfo, unlockCount)
            val serial = SerialDecoder.decode(uidLsbFirst)

            return SensorActivation(
                uid = uidLsbFirst,
                patchInfo = patchInfo,
                mac = mac,
                serial = serial,
                unlockCount = unlockCount + 1,
            )
        } finally {
            try { nfcV.close() } catch (_: IOException) {}
        }
    }

    /** Send `0xA1 <manufacturer>` and return the patchInfo bytes (status stripped). */
    private fun getPatchInfo(nfcV: NfcV, uid: ByteArray): ByteArray {
        val cmd = byteArrayOf(
            FLAGS_HIGH_DATA_RATE.toByte(),
            CMD_GET_PATCH_INFO.toByte(),
            uid[6], // manufacturer
        )
        val resp = transceiveWithRetry(nfcV, cmd, "getPatchInfo")
        if (resp.isEmpty()) {
            throw ActivationException.SensorRejected("getPatchInfo", -1)
        }
        if ((resp[0].toInt() and 0xFF) != 0x00) {
            throw ActivationException.SensorRejected("getPatchInfo", resp[0].toInt() and 0xFF)
        }
        return resp.copyOfRange(1, resp.size)
    }

    /**
     * Send the activation frame and return the 6-byte BLE MAC (un-reversed,
     * formatted as XX:XX:XX:XX:XX:XX by the caller via [SensorActivation.macFormatted]).
     */
    private fun enableBleStreaming(
        nfcV: NfcV,
        uid: ByteArray,
        patchInfo: ByteArray,
        unlockCount: Int,
    ): ByteArray {
        val payload = UnlockPayload.streamingUnlockPayload(
            uid = uid,
            patchInfo = patchInfo,
            op = UnlockPayload.OP_ENABLE_BLE_STREAMING,
            unlockCount = unlockCount,
        )

        val cmd = ByteArray(3 + payload.size)
        cmd[0] = FLAGS_HIGH_DATA_RATE.toByte()
        cmd[1] = CMD_GET_PATCH_INFO.toByte()
        cmd[2] = uid[6]
        System.arraycopy(payload, 0, cmd, 3, payload.size)

        val resp = transceiveWithRetry(nfcV, cmd, "enableBleStreaming")
        if (resp.size < 7) {
            throw ActivationException.UnexpectedResponseLength(
                "enableBleStreaming", expected = 7, got = resp.size
            )
        }
        if ((resp[0].toInt() and 0xFF) != 0x00) {
            throw ActivationException.SensorRejected("enableBleStreaming", resp[0].toInt() and 0xFF)
        }

        // resp[1..7] = MAC reversed; reverse it to standard order.
        val mac = ByteArray(6)
        for (i in 0..5) mac[i] = resp[6 - i + 1]
        return mac
    }

    private fun transceiveWithRetry(nfcV: NfcV, cmd: ByteArray, stage: String): ByteArray {
        var lastError: Throwable? = null
        for (attempt in 0 until MAX_ATTEMPTS) {
            try {
                return nfcV.transceive(cmd)
            } catch (e: IOException) {
                lastError = e
                Thread.sleep(RETRY_DELAY_MS)
            }
        }
        throw ActivationException.TransceiveFailed(stage, lastError ?: IOException("unknown"))
    }

    companion object {
        private const val MANUFACTURER_ABBOTT = 0x07
        private const val FLAGS_HIGH_DATA_RATE = 0x02
        private const val CMD_GET_PATCH_INFO = 0xA1

        private const val TRANSCEIVE_TIMEOUT_MS = 2_000
        private const val RETRY_DELAY_MS = 100L
        private const val MAX_ATTEMPTS = 3
    }
}
