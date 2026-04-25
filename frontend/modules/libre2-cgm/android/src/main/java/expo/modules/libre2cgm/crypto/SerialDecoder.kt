package expo.modules.libre2cgm.crypto

/**
 * Decode a Libre sensor's printed serial number from its 8-byte NFC UID.
 *
 * Algorithm (reimplemented from the spec, not copied):
 *   - Take uid[2..8] (6 bytes), reversed.
 *   - Treat the resulting 48 bits as a base-32 number.
 *   - Map each 5-bit group through Abbott's custom alphabet.
 *
 * Reference: LibreUtils.decodeSerialNumber in xDrip+.
 */
object SerialDecoder {
    private const val ALPHABET = "0123456789ACDEFGHJKLMNPQRTUVWXYZ"

    fun decode(uid: ByteArray): String {
        require(uid.size == 8) { "uid must be 8 bytes" }

        // Reverse uid[2..8] → 6 bytes high-order first.
        val reversed = ByteArray(6)
        for (i in 0..5) reversed[i] = uid[7 - i]

        // Pack into a 48-bit big-endian number.
        var value = 0L
        for (b in reversed) {
            value = (value shl 8) or (b.toLong() and 0xFF)
        }

        // Read 10 base-32 digits (50 bits would overflow; we only need 48 / 5 ≈ 10 digits).
        // The first character of the printed serial is a fixed type letter (typically '0' for Libre),
        // so we emit 10 digits and prepend it.
        val sb = StringBuilder()
        for (i in 9 downTo 0) {
            val idx = ((value ushr (5 * i)) and 0x1F).toInt()
            sb.append(ALPHABET[idx])
        }
        return "0" + sb.toString()
    }
}
