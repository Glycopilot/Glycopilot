package expo.modules.libre2cgm.model

import org.junit.Assert.assertEquals
import org.junit.Test

class GlucosePacketTest {

    @Test
    fun parsesAllTenMeasurementsAndWearTime() {
        // Build a 46-byte packet where measurement[i].rawGlucose = 100 + i.
        val plain = ByteArray(46)
        // header (offset 0..1) is irrelevant for parsing
        for (i in 0..9) {
            val raw = 100 + i  // fits in 14 bits
            val packed = raw.toLong() and 0x3FFF
            val off = 2 + 4 * i
            plain[off]     = (packed and 0xFF).toByte()
            plain[off + 1] = ((packed ushr 8) and 0xFF).toByte()
            plain[off + 2] = 0
            plain[off + 3] = 0
        }
        // wear time = 1234 (LE) at offset 42..43
        plain[42] = 0xD2.toByte()
        plain[43] = 0x04
        // CRC trailer is not validated by GlucosePacket.parse (only by BleDecryptor).

        val pkt = GlucosePacket.parse(plain)
        assertEquals(100, pkt.current.rawGlucose)
        assertEquals(GlucoseReading.Kind.CURRENT, pkt.current.kind)
        assertEquals(0, pkt.current.ageMinutes)

        assertEquals(6, pkt.trend.size)
        assertEquals(101, pkt.trend[0].rawGlucose)
        assertEquals(1, pkt.trend[0].ageMinutes)
        assertEquals(106, pkt.trend[5].rawGlucose)
        assertEquals(6, pkt.trend[5].ageMinutes)

        assertEquals(3, pkt.history.size)
        assertEquals(107, pkt.history[0].rawGlucose)
        assertEquals(15, pkt.history[0].ageMinutes)
        assertEquals(109, pkt.history[2].rawGlucose)
        assertEquals(45, pkt.history[2].ageMinutes)

        assertEquals(1234, pkt.wearTimeMinutes)
    }
}
