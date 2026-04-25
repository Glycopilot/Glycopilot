package expo.modules.libre2cgm.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Crc16Test {

    /** Standard CCITT-FALSE check value: CRC-16 of ASCII "123456789" = 0x29B1. */
    @Test
    fun standardReferenceVector() {
        val data = "123456789".toByteArray(Charsets.US_ASCII)
        assertEquals(0x29B1, Crc16.compute(data))
    }

    @Test
    fun emptyInputYieldsInit() {
        assertEquals(0xFFFF, Crc16.compute(ByteArray(0)))
    }

    @Test
    fun singleByteZero() {
        // CRC-16/CCITT-FALSE of a single 0x00 byte = 0xE1F0.
        assertEquals(0xE1F0, Crc16.compute(byteArrayOf(0x00)))
    }

    @Test
    fun verifyByteSwappedTrailerRoundTrips() {
        val payload = byteArrayOf(0x01, 0x02, 0x03, 0x04)
        val crc = Crc16.compute(payload)
        // Build the on-the-wire representation: prefix + byte-swapped CRC.
        val onWire = payload + byteArrayOf(
            ((crc ushr 8) and 0xFF).toByte(),
            (crc and 0xFF).toByte(),
        )
        assertTrue(Crc16.verifyTrailingByteSwapped(onWire, payload.size))
    }
}
