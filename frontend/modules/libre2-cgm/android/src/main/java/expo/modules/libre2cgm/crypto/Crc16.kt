package expo.modules.libre2cgm.crypto

/**
 * CRC-16/CCITT-FALSE.
 * poly=0x1021  init=0xFFFF  refin=false  refout=false  xorout=0x0000
 *
 * Used by the Libre 2 protocol on:
 *  - the FRAM verify (LibreUtils.verify)
 *  - the streaming-unlock-payload integrity bytes
 *  - the trailer of every BLE plaintext packet
 */
object Crc16 {
    private const val POLY = 0x1021
    private const val INIT = 0xFFFF

    fun compute(data: ByteArray, offset: Int = 0, length: Int = data.size - offset): Int {
        require(offset >= 0 && length >= 0 && offset + length <= data.size) {
            "Invalid range offset=$offset length=$length size=${data.size}"
        }
        var crc = INIT
        for (i in offset until offset + length) {
            crc = crc xor ((data[i].toInt() and 0xFF) shl 8)
            repeat(8) {
                crc = if ((crc and 0x8000) != 0) {
                    ((crc shl 1) xor POLY) and 0xFFFF
                } else {
                    (crc shl 1) and 0xFFFF
                }
            }
        }
        return crc and 0xFFFF
    }

    /** Verify a packet whose last 2 bytes carry a byte-swapped CRC over the prefix. */
    fun verifyTrailingByteSwapped(data: ByteArray, prefixLength: Int): Boolean {
        require(data.size >= prefixLength + 2)
        val expected = (
            (data[prefixLength + 1].toInt() and 0xFF) shl 8 or
                (data[prefixLength].toInt() and 0xFF)
            ) and 0xFFFF
        val actual = compute(data, 0, prefixLength)
        // The trailer is byte-swapped on the wire vs the natural u16 layout.
        val actualSwapped = ((actual and 0xFF) shl 8) or ((actual shr 8) and 0xFF)
        return actualSwapped == expected
    }
}
