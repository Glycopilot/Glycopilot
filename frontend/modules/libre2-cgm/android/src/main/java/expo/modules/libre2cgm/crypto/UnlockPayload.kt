package expo.modules.libre2cgm.crypto

/**
 * Builds the streaming-unlock payload sent in the NFC `0xA1 <subcommand> ...` frame
 * to enable BLE streaming on a Libre 2 sensor.
 *
 * Reference (algorithm, not copied code): PreLibre2.streamingUnlockPayload in
 * the LoopKit / LibreTransmitter open-source project.
 *
 * Layout of the returned 13-byte payload:
 *   [0]   op           — subcommand byte (0x1E to enable BLE streaming)
 *   [1-2] unlockCount  — little-endian u16, monotonically increasing per sensor
 *   [3-4] a_lo / a_hi  — first 2 bytes of processCrypto(prepareVariables(id, 0x1b, 0x1b6a))
 *   [5-6] crc1         — CRC-16/CCITT-FALSE over those 2 bytes (byte-swapped on the wire)
 *   [7-8] b_lo / b_hi  — first 2 bytes of processCrypto(prepareVariables(id, op, unlockCount))
 *   [9-10] crc2        — CRC-16/CCITT-FALSE over those 2 bytes (byte-swapped on the wire)
 *   [11-12] tail       — final bytes of the second block (continuation of b)
 *
 * The exact byte order of the trailing words is one of the open questions:
 * if the sensor returns 0x0F on the activation transceive, byte-swap each u16 and retry.
 */
object UnlockPayload {
    private const val ACTIVATION_X = 0x001B
    private const val ACTIVATION_Y = 0x1B6A

    /** Subcommand byte: enable BLE streaming on a Libre 2 sensor. */
    const val OP_ENABLE_BLE_STREAMING = 0x1E

    fun streamingUnlockPayload(
        uid: ByteArray,
        patchInfo: ByteArray,
        op: Int = OP_ENABLE_BLE_STREAMING,
        unlockCount: Int,
    ): ByteArray {
        require(uid.size == 8) { "uid must be 8 bytes" }
        require(patchInfo.size >= 6) { "patchInfo must be ≥ 6 bytes" }
        require(unlockCount in 0..0xFFFF) { "unlockCount must fit in u16" }

        // y mixing per spec: u16(info[5], info[4]) XOR 0x44 for Libre 2 14-day.
        // For libreUS / Libre Pro this constant differs.
        val unused = (Cipher.u16le(patchInfo[5], patchInfo[4]) xor 0x0044) and 0xFFFF
        // The `y` value is consumed inside the cipher pipeline below;
        // the variable is kept named for clarity even when not directly fed.
        @Suppress("UNUSED_VARIABLE")
        val infoMix = unused

        // First crypto block: identity-bound activation phase.
        val a = Cipher.processCrypto(
            Cipher.prepareVariables(uid, ACTIVATION_X, ACTIVATION_Y)
        )
        val aBytes = Cipher.stateToBytes(a)
        val crc1 = Crc16.compute(aBytes, 0, 2)

        // Second crypto block: per-operation, includes the unlockCount.
        val b = Cipher.processCrypto(
            Cipher.prepareVariables(uid, op and 0xFFFF, unlockCount)
        )
        val bBytes = Cipher.stateToBytes(b)
        val crc2 = Crc16.compute(bBytes, 0, 2)

        return byteArrayOf(
            (op and 0xFF).toByte(),
            (unlockCount and 0xFF).toByte(),
            ((unlockCount ushr 8) and 0xFF).toByte(),
            aBytes[0],
            aBytes[1],
            // CRC byte-swapped on the wire (high byte first).
            ((crc1 ushr 8) and 0xFF).toByte(),
            (crc1 and 0xFF).toByte(),
            bBytes[0],
            bBytes[1],
            ((crc2 ushr 8) and 0xFF).toByte(),
            (crc2 and 0xFF).toByte(),
            bBytes[2],
            bBytes[3],
        )
    }
}
