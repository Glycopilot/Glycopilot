package expo.modules.libre2cgm.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class UnlockPayloadTest {

    private val uid = byteArrayOf(
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08
    )
    private val patchInfo = byteArrayOf(0x9D.toByte(), 0x08, 0x00, 0x00, 0x00, 0x00)

    @Test
    fun payloadIsThirteenBytes() {
        val out = UnlockPayload.streamingUnlockPayload(
            uid = uid,
            patchInfo = patchInfo,
            unlockCount = 1,
        )
        assertEquals(13, out.size)
    }

    @Test
    fun firstByteIsTheOpcode() {
        val out = UnlockPayload.streamingUnlockPayload(
            uid = uid,
            patchInfo = patchInfo,
            unlockCount = 0,
        )
        assertEquals(UnlockPayload.OP_ENABLE_BLE_STREAMING.toByte(), out[0])
    }

    @Test
    fun unlockCountSerializedLittleEndian() {
        val out = UnlockPayload.streamingUnlockPayload(
            uid = uid,
            patchInfo = patchInfo,
            unlockCount = 0x1234,
        )
        assertEquals(0x34.toByte(), out[1])
        assertEquals(0x12.toByte(), out[2])
    }

    @Test
    fun differentCountsYieldDifferentPayloads() {
        val a = UnlockPayload.streamingUnlockPayload(uid, patchInfo, unlockCount = 1)
        val b = UnlockPayload.streamingUnlockPayload(uid, patchInfo, unlockCount = 2)
        // Same UID/patchInfo with different counts must produce different payloads.
        assertNotEquals(a.toList(), b.toList())
    }
}
