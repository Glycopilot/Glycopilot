package expo.modules.libre2cgm.crypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Test

/**
 * Structural tests for [BleDecryptor]. These do NOT prove bit-perfect
 * correctness against a real sensor — that requires test vectors that we will
 * collect once a Libre 2 sensor is available. They DO catch regressions in
 * length handling, header passthrough, and CRC validation.
 */
class BleDecryptorTest {

    private val uid = byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08)

    @Test
    fun rejectsBadInputLength() {
        val tooShort = ByteArray(10)
        assertThrows(IllegalArgumentException::class.java) {
            BleDecryptor.decrypt(uid, tooShort)
        }
    }

    @Test
    fun headerPassesThroughUnchanged() {
        val encrypted = ByteArray(46)
        encrypted[0] = 0x12
        encrypted[1] = 0x34

        // Build a valid packet by encrypting a known plaintext: header + zeros + good CRC.
        val plain = ByteArray(46)
        plain[0] = 0x12
        plain[1] = 0x34
        // bytes 2..43 = 0
        val crc = Crc16.compute(plain, 0, 44)
        plain[44] = ((crc ushr 8) and 0xFF).toByte()
        plain[45] = (crc and 0xFF).toByte()

        // Encrypt the prepared plaintext: feed it back through decrypt (the
        // cipher is its own inverse in counter mode).
        val cipherText = encryptForTest(uid, plain)
        val out = BleDecryptor.decrypt(uid, cipherText)

        // Header bytes preserved.
        assertEquals(plain[0], out[0])
        assertEquals(plain[1], out[1])
        assertArrayEquals(plain, out)
    }

    @Test
    fun corruptCrcThrows() {
        val plain = ByteArray(46).also {
            it[0] = 0x12; it[1] = 0x34
            val crc = Crc16.compute(it, 0, 44)
            it[44] = ((crc ushr 8) and 0xFF).toByte()
            it[45] = (crc and 0xFF).toByte()
        }
        val cipherText = encryptForTest(uid, plain).copyOf()
        // Flip a byte inside the encrypted area to corrupt the resulting plaintext CRC.
        cipherText[10] = (cipherText[10].toInt() xor 0xFF).toByte()

        assertThrows(BleDecryptor.CrcMismatchException::class.java) {
            BleDecryptor.decrypt(uid, cipherText)
        }
    }

    @Test
    fun differentUidsProduceDifferentPlaintext() {
        val plain = ByteArray(46).also {
            val crc = Crc16.compute(it, 0, 44)
            it[44] = ((crc ushr 8) and 0xFF).toByte()
            it[45] = (crc and 0xFF).toByte()
        }
        val cipherText = encryptForTest(uid, plain)
        val otherUid = byteArrayOf(0x09, 0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02)
        // Decrypting with the wrong UID will almost certainly fail the CRC check.
        assertThrows(BleDecryptor.CrcMismatchException::class.java) {
            BleDecryptor.decrypt(otherUid, cipherText)
        }
        assertNotEquals(uid.toList(), otherUid.toList())
    }

    /**
     * Run the same keystream the decryptor uses, in reverse: encrypt = plain XOR keystream.
     * Used only to build test fixtures.
     */
    private fun encryptForTest(uid: ByteArray, plain: ByteArray): ByteArray {
        val ivX = Cipher.u16le(plain[0], plain[1])
        val ivY = (Cipher.u16le(0x1B, 0x6A) xor ivX) and 0xFFFF
        var state = Cipher.prepareVariables(uid, ivX, ivY)
        val out = ByteArray(46)
        out[0] = plain[0]
        out[1] = plain[1]
        var written = 2
        while (written < 46) {
            state = Cipher.processCrypto(state)
            val keystream = Cipher.stateToBytes(state)
            val chunkLength = minOf(8, 46 - written)
            for (i in 0 until chunkLength) {
                out[written + i] = (plain[written + i].toInt() xor keystream[i].toInt()).toByte()
            }
            written += chunkLength
        }
        return out
    }
}
