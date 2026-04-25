package expo.modules.libre2cgm.ble

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PacketAccumulatorTest {

    @Test
    fun returnsNullUntilTargetReached() {
        val a = PacketAccumulator(targetLength = 10)
        assertNull(a.feed(byteArrayOf(1, 2, 3)))
        assertEquals(3, a.pendingBytes)
        assertNull(a.feed(byteArrayOf(4, 5, 6)))
        assertEquals(6, a.pendingBytes)
    }

    @Test
    fun yieldsCompletedPacketAndResets() {
        val a = PacketAccumulator(targetLength = 4)
        assertNull(a.feed(byteArrayOf(1, 2)))
        val out = a.feed(byteArrayOf(3, 4))
        assertArrayEquals(byteArrayOf(1, 2, 3, 4), out)
        assertEquals(0, a.pendingBytes)
    }

    @Test
    fun yieldsPacketEvenWhenChunkOvershoots() {
        val a = PacketAccumulator(targetLength = 4)
        // First chunk delivers 6 bytes; only the first 4 form one packet, the
        // remaining 2 must seed the next packet.
        val out = a.feed(byteArrayOf(1, 2, 3, 4, 5, 6))
        assertArrayEquals(byteArrayOf(1, 2, 3, 4), out)
        assertEquals(2, a.pendingBytes)
        val out2 = a.feed(byteArrayOf(7, 8))
        assertArrayEquals(byteArrayOf(5, 6, 7, 8), out2)
    }

    @Test
    fun resetClearsBuffer() {
        val a = PacketAccumulator(targetLength = 4)
        a.feed(byteArrayOf(1, 2, 3))
        a.reset()
        assertEquals(0, a.pendingBytes)
    }
}
