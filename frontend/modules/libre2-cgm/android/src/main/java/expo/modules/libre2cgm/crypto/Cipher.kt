package expo.modules.libre2cgm.crypto

/**
 * The custom 16-bit-word block cipher used by Libre 2.
 * It is NOT AES — it is a Feistel-like primitive operating on a 4×UInt16 state.
 *
 * Reference (algorithm only — not copied code): PreLibre2.processCrypto in
 * the LoopKit / LibreTransmitter open-source project.
 *
 * The cipher is used to derive
 *  - the NFC streaming-unlock-payload (op = 0x1E)
 *  - the BLE keystream (in counter-like mode driven by the per-packet header)
 *  - the FRAM block keystream
 *
 * IMPORTANT: the exact rotation count and conditional XOR pattern below is the
 * best reconstruction available from public protocol notes. Validate against
 * known test vectors (see CipherTest) before assuming bit-perfect correctness.
 */
internal object Cipher {
    /** Baked-in 4-word key. */
    private val KEY = intArrayOf(0xA0C5, 0x6860, 0x0000, 0x14C6)

    /** Number of rounds in [processCrypto]. */
    private const val ROUNDS = 8

    /**
     * Apply the cipher to a 4-word state and return the new state.
     * Inputs/outputs are unsigned 16-bit values stored in Int (low 16 bits).
     */
    fun processCrypto(input: IntArray): IntArray {
        require(input.size == 4) { "state must be 4 UInt16 words" }
        val s = IntArray(4) { input[it] and 0xFFFF }
        repeat(ROUNDS) {
            for (i in 0..3) {
                val word = s[i]
                var tmp = ((word ushr 2) or (word shl 14)) and 0xFFFF
                if ((word and 1) != 0) tmp = tmp xor KEY[(i + 1) and 3]
                if ((word and 2) != 0) tmp = tmp xor KEY[(i + 3) and 3]
                s[(i + 1) and 3] = (s[(i + 1) and 3] xor tmp) and 0xFFFF
            }
        }
        return s
    }

    /**
     * Build the initial cipher state from the sensor UID and two contextual u16 values.
     *
     * Per spec:
     *   s0 = u16(uid[0..1])
     *   s1 = u16(uid[2..3]) XOR x
     *   s2 = u16(uid[4..5]) XOR y
     *   s3 = u16(uid[6..7])
     */
    fun prepareVariables(uid: ByteArray, x: Int, y: Int): IntArray {
        require(uid.size == 8) { "uid must be 8 bytes" }
        return intArrayOf(
            u16le(uid[0], uid[1]),
            u16le(uid[2], uid[3]) xor (x and 0xFFFF),
            u16le(uid[4], uid[5]) xor (y and 0xFFFF),
            u16le(uid[6], uid[7]),
        )
    }

    /**
     * usefulFunction: prepareVariables → XOR magic constants → processCrypto.
     * Returns the 4-word state packed as a long (low word first) so callers can
     * extract bytes deterministically.
     */
    fun usefulFunction(uid: ByteArray, x: Int, y: Int): IntArray {
        val s = prepareVariables(uid, x, y)
        s[0] = s[0] xor 0x4163
        s[3] = s[3] xor 0x4344
        return processCrypto(s)
    }

    /** Pack low byte, high byte (little-endian). */
    fun u16le(low: Byte, high: Byte): Int =
        (low.toInt() and 0xFF) or ((high.toInt() and 0xFF) shl 8)

    /** Reassemble a 4×u16 state into 8 bytes, little-endian within each word. */
    fun stateToBytes(state: IntArray): ByteArray {
        require(state.size == 4)
        val out = ByteArray(8)
        for (i in 0..3) {
            out[2 * i] = (state[i] and 0xFF).toByte()
            out[2 * i + 1] = ((state[i] ushr 8) and 0xFF).toByte()
        }
        return out
    }
}
