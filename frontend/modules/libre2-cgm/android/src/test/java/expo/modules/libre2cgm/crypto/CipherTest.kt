package expo.modules.libre2cgm.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

/**
 * Tests for the custom 16-bit-word cipher used by Libre 2.
 *
 * NOTE: real validation requires the test vectors that live at the bottom of
 * PreLibre2.swift in the LibreTransmitter project. Until those are imported,
 * these tests only check structural invariants (state size, determinism,
 * non-identity behaviour). DO NOT take the absence of a failure here as
 * proof of bit-perfect correctness.
 */
class CipherTest {

    @Test
    fun prepareVariablesProducesFourWords() {
        val uid = byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08)
        val s = Cipher.prepareVariables(uid, 0x1234, 0x5678)
        assertEquals(4, s.size)
        assertEquals(0x0201, s[0])                         // u16(0x01, 0x02)
        assertEquals(0x0403 xor 0x1234, s[1])              // u16(0x03, 0x04) XOR x
        assertEquals(0x0605 xor 0x5678, s[2])              // u16(0x05, 0x06) XOR y
        assertEquals(0x0807, s[3])                         // u16(0x07, 0x08)
    }

    @Test
    fun processCryptoIsDeterministic() {
        val state = intArrayOf(0xDEAD, 0xBEEF, 0xCAFE, 0xBABE)
        val a = Cipher.processCrypto(state)
        val b = Cipher.processCrypto(state)
        assertEquals(a.toList(), b.toList())
    }

    @Test
    fun processCryptoOutputDiffersFromInput() {
        val state = intArrayOf(0xDEAD, 0xBEEF, 0xCAFE, 0xBABE)
        val out = Cipher.processCrypto(state)
        // Sanity: the cipher must transform the state.
        assertNotEquals(state.toList(), out.toList())
    }

    @Test
    fun stateToBytesIsLittleEndian() {
        val bytes = Cipher.stateToBytes(intArrayOf(0x1234, 0x5678, 0x9ABC, 0xDEF0))
        assertEquals(0x34.toByte(), bytes[0])
        assertEquals(0x12.toByte(), bytes[1])
        assertEquals(0x78.toByte(), bytes[2])
        assertEquals(0x56.toByte(), bytes[3])
        assertEquals(0xBC.toByte(), bytes[4])
        assertEquals(0x9A.toByte(), bytes[5])
        assertEquals(0xF0.toByte(), bytes[6])
        assertEquals(0xDE.toByte(), bytes[7])
    }
}
