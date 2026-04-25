package expo.modules.libre2cgm.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GlucoseReadingTest {

    @Test
    fun extractsRawGlucoseFromLowFourteenBits() {
        // value = 0x000003E8 = 1000  → fits in lower 14 bits, no other fields set.
        val bytes = byteArrayOf(0xE8.toByte(), 0x03, 0x00, 0x00)
        val r = GlucoseReading.fromBytes(bytes, GlucoseReading.Kind.CURRENT, ageMinutes = 0)
        assertEquals(1000, r.rawGlucose)
        assertEquals(0, r.rawTemperature)
        assertEquals(0, r.temperatureAdjustment)
        assertFalse(r.hasError)
        assertTrue(r.isValid)
        // 1000 / 8.5 ≈ 117.6 → round-half-up = 118 mg/dL
        assertEquals(118.0, r.mgdl, 0.001)
    }

    @Test
    fun extractsRawTemperatureFromBits14To25() {
        // raw = 0, temp = 0x123 (291), adjust = 0, error = 0
        // packed: temp << 14 = 0x048C000  →  bytes LE: 00 C0 48 04
        val packed = (0x123L shl 14) and 0xFFFFFFFFL
        val bytes = byteArrayOf(
            (packed and 0xFF).toByte(),
            ((packed ushr 8) and 0xFF).toByte(),
            ((packed ushr 16) and 0xFF).toByte(),
            ((packed ushr 24) and 0xFF).toByte(),
        )
        val r = GlucoseReading.fromBytes(bytes, GlucoseReading.Kind.TREND, ageMinutes = 1)
        assertEquals(0, r.rawGlucose)
        assertEquals(0x123, r.rawTemperature)
        assertFalse(r.hasError)
        // raw == 0 → reading is invalid (NaN mgdl).
        assertFalse(r.isValid)
    }

    @Test
    fun errorFlagBit31MakesReadingInvalid() {
        val packed = 0x80000064L  // raw = 100 but error flag set
        val bytes = byteArrayOf(
            (packed and 0xFF).toByte(),
            ((packed ushr 8) and 0xFF).toByte(),
            ((packed ushr 16) and 0xFF).toByte(),
            ((packed ushr 24) and 0xFF).toByte(),
        )
        val r = GlucoseReading.fromBytes(bytes, GlucoseReading.Kind.CURRENT, ageMinutes = 0)
        assertEquals(100, r.rawGlucose)
        assertTrue(r.hasError)
        assertFalse(r.isValid)
    }
}
