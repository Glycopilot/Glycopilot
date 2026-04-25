package expo.modules.libre2cgm.ble

/**
 * Buffers BLE indication chunks until a full 46-byte Libre 2 packet has been
 * received, then yields it.
 *
 * Wire chunking varies (`20 + 18 + 8`, `20 + 20 + 6`, etc.), so we cannot
 * assume any particular indication boundary. We only assume that a complete
 * 46-byte packet always arrives before another one starts.
 */
class PacketAccumulator(private val targetLength: Int = 46) {

    private val buffer = ByteArray(targetLength)
    private var written: Int = 0

    /**
     * Append [chunk] to the current packet. If the chunk completes (or overshoots)
     * the target length, the full packet is returned and the buffer reset; any
     * extra bytes start the next packet.
     *
     * @return the completed 46-byte packet, or null if more bytes are still needed.
     */
    fun feed(chunk: ByteArray): ByteArray? {
        var offset = 0
        var completed: ByteArray? = null

        while (offset < chunk.size) {
            val toCopy = minOf(targetLength - written, chunk.size - offset)
            System.arraycopy(chunk, offset, buffer, written, toCopy)
            written += toCopy
            offset += toCopy

            if (written == targetLength) {
                if (completed != null) {
                    // We hit a second completion in the same chunk; the spec says this
                    // shouldn't happen, but guard against drift by dropping anything past
                    // the first completed packet.
                    written = 0
                    return completed
                }
                completed = buffer.copyOf()
                written = 0
            }
        }
        return completed
    }

    fun reset() {
        written = 0
    }

    val pendingBytes: Int get() = written
}
