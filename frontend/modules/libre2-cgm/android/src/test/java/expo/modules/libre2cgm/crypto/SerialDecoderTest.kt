package expo.modules.libre2cgm.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class SerialDecoderTest {

    @Test
    fun differentUidsProduceDifferentSerials() {
        val a = SerialDecoder.decode(byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08))
        val b = SerialDecoder.decode(byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x09))
        assertNotEquals(a, b)
    }

    @Test
    fun outputAlwaysStartsWithFixedTypePrefix() {
        val s = SerialDecoder.decode(byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08))
        assertEquals('0', s[0])
    }

    @Test
    fun outputLengthIsElevenChars() {
        val s = SerialDecoder.decode(byteArrayOf(0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08))
        // 1 prefix character + 10 base-32 digits.
        assertEquals(11, s.length)
    }
}
