package expo.modules.libre2cgm.model

/**
 * A decoded 46-byte plaintext Libre 2 BLE packet.
 *
 * Layout (offsets within the plaintext after [BleDecryptor.decrypt]):
 *   0..1    encrypted-header echo (kept by the cipher)
 *   2..5    measurement[0]  current glucose
 *   6..9    measurement[1]  trend  -1 min
 *   10..13  measurement[2]  trend  -2 min
 *   14..17  measurement[3]  trend  -3 min
 *   18..21  measurement[4]  trend  -4 min
 *   22..25  measurement[5]  trend  -5 min
 *   26..29  measurement[6]  trend  -6 min
 *   30..33  measurement[7]  history -1 (-15 min relative)
 *   34..37  measurement[8]  history -2 (-30 min relative)
 *   38..41  measurement[9]  history -3 (-45 min relative)
 *   42..43  sensor age in minutes (LE u16, "wearTimeMinutes")
 *   44..45  CRC trailer (verified by [BleDecryptor.decrypt], not exposed here)
 */
data class GlucosePacket(
    val current: GlucoseReading,
    val trend: List<GlucoseReading>,
    val history: List<GlucoseReading>,
    /** Total minutes the sensor has been worn, as reported by the sensor. */
    val wearTimeMinutes: Int,
) {
    companion object {
        private const val LENGTH = 46

        fun parse(plain: ByteArray): GlucosePacket {
            require(plain.size == LENGTH) { "plaintext packet must be $LENGTH bytes" }

            val current = readField(plain, offset = 2, kind = GlucoseReading.Kind.CURRENT, age = 0)
            val trend = (1..6).map { i ->
                readField(plain, offset = 2 + 4 * i, kind = GlucoseReading.Kind.TREND, age = i)
            }
            val history = (1..3).map { i ->
                readField(
                    plain,
                    offset = 2 + 4 * (6 + i),
                    kind = GlucoseReading.Kind.HISTORY,
                    age = i * 15,
                )
            }
            val wear = (
                (plain[42].toInt() and 0xFF) or
                    ((plain[43].toInt() and 0xFF) shl 8)
                )

            return GlucosePacket(
                current = current,
                trend = trend,
                history = history,
                wearTimeMinutes = wear,
            )
        }

        private fun readField(
            plain: ByteArray,
            offset: Int,
            kind: GlucoseReading.Kind,
            age: Int,
        ): GlucoseReading {
            val slice = ByteArray(4)
            System.arraycopy(plain, offset, slice, 0, 4)
            return GlucoseReading.fromBytes(slice, kind, age)
        }
    }
}
