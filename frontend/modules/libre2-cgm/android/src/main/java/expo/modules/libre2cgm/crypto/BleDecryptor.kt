package expo.modules.libre2cgm.crypto

/**
 * Decrypt the 46-byte payload that the Libre 2 sensor delivers via BLE
 * indications on characteristic F002.
 *
 * The cipher is the same custom 16-bit-word block cipher as in [Cipher],
 * driven in a counter-like mode. The first 2 bytes of the encrypted buffer
 * carry an "encrypted header" that seeds the keystream, and pass through
 * the decryption unchanged.
 *
 * The 44 encrypted bytes after the header are XORed with successive
 * 8-byte keystream blocks produced by repeatedly applying [Cipher.processCrypto].
 *
 * Reference (algorithm only): PreLibre2.decryptBLE in LibreTransmitter.
 */
object BleDecryptor {
    private const val EXPECTED_LENGTH = 46
    private const val HEADER_LENGTH = 2

    class CrcMismatchException(
        val expected: Int,
        val actual: Int,
    ) : Exception("BLE packet CRC mismatch (expected=0x%04X actual=0x%04X)".format(expected, actual))

    /**
     * Decrypt and verify [encrypted]. Returns the 46-byte plaintext.
     *
     * @throws IllegalArgumentException if [encrypted] does not have the expected length.
     * @throws CrcMismatchException if the trailing CRC check fails (caller should drop the packet).
     */
    @Throws(CrcMismatchException::class)
    fun decrypt(uid: ByteArray, encrypted: ByteArray): ByteArray {
        require(uid.size == 8) { "uid must be 8 bytes" }
        require(encrypted.size == EXPECTED_LENGTH) {
            "encrypted payload must be $EXPECTED_LENGTH bytes (got ${encrypted.size})"
        }

        val ivX = Cipher.u16le(encrypted[0], encrypted[1])
        val ivY = (Cipher.u16le(0x1B, 0x6A) xor ivX) and 0xFFFF
        var state = Cipher.prepareVariables(uid, ivX, ivY)

        val plain = ByteArray(EXPECTED_LENGTH)
        plain[0] = encrypted[0]
        plain[1] = encrypted[1]

        var written = HEADER_LENGTH
        while (written < EXPECTED_LENGTH) {
            state = Cipher.processCrypto(state)
            val keystream = Cipher.stateToBytes(state)
            val chunkLength = minOf(8, EXPECTED_LENGTH - written)
            for (i in 0 until chunkLength) {
                plain[written + i] = (encrypted[written + i].toInt() xor keystream[i].toInt()).toByte()
            }
            written += chunkLength
        }

        verifyCrc(plain)
        return plain
    }

    /** Check the trailing CRC-16/CCITT-FALSE (last 2 bytes, byte-swapped on the wire). */
    private fun verifyCrc(plain: ByteArray) {
        val expected = (
            (plain[EXPECTED_LENGTH - 1].toInt() and 0xFF) shl 8 or
                (plain[EXPECTED_LENGTH - 2].toInt() and 0xFF)
            ) and 0xFFFF
        val actual = Crc16.compute(plain, 0, EXPECTED_LENGTH - 2)
        val actualSwapped = ((actual and 0xFF) shl 8) or ((actual ushr 8) and 0xFF)
        if (actualSwapped != expected) {
            throw CrcMismatchException(expected, actualSwapped)
        }
    }
}
