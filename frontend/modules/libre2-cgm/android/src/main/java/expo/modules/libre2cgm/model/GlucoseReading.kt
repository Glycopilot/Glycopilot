package expo.modules.libre2cgm.model

/**
 * One glucose measurement extracted from a 4-byte field of a Libre 2 BLE packet.
 *
 * Bit layout (little-endian within the 4 bytes):
 *   bits  0..13  (14)  raw glucose (sensor ADC counts)
 *   bits 14..25  (12)  raw temperature
 *   bits 26..30  ( 5)  temperature adjustment
 *   bit  31      ( 1)  has-error / sign flag
 */
data class GlucoseReading(
    val rawGlucose: Int,
    val rawTemperature: Int,
    val temperatureAdjustment: Int,
    val hasError: Boolean,
    val mgdl: Double,
    /** Kind of measurement: current, trend (per-min), history (per-15-min). */
    val kind: Kind,
    /** Minutes ago, relative to the "current" reading in the same packet. */
    val ageMinutes: Int,
) {
    enum class Kind { CURRENT, TREND, HISTORY }

    /** Empirical conversion factor used by xDrip+ / LibreTransmitter for the uncalibrated path. */
    companion object {
        const val MGDL_PER_RAW = 1.0 / 8.5
        const val MGDL_TO_MMOL = 1.0 / 18.0182

        fun fromBytes(bytes: ByteArray, kind: Kind, ageMinutes: Int): GlucoseReading {
            require(bytes.size == 4) { "measurement field must be 4 bytes" }
            val v = (
                (bytes[0].toLong() and 0xFF) or
                    ((bytes[1].toLong() and 0xFF) shl 8) or
                    ((bytes[2].toLong() and 0xFF) shl 16) or
                    ((bytes[3].toLong() and 0xFF) shl 24)
                ) and 0xFFFFFFFFL

            val rawGlucose = (v and 0x3FFF).toInt()
            val rawTemperature = ((v ushr 14) and 0xFFF).toInt()
            val tempAdjust = ((v ushr 26) and 0x1F).toInt()
            val err = ((v ushr 31) and 0x1) != 0L

            val mgdl = if (err || rawGlucose == 0) {
                Double.NaN
            } else {
                Math.round(rawGlucose * MGDL_PER_RAW).toDouble()
            }
            return GlucoseReading(rawGlucose, rawTemperature, tempAdjust, err, mgdl, kind, ageMinutes)
        }
    }

    val isValid: Boolean get() = !hasError && rawGlucose != 0 && !mgdl.isNaN()
    val mmol: Double get() = mgdl * MGDL_TO_MMOL
}
