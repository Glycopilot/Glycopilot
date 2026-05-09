package expo.modules.libre2cgm.juggluco

import android.content.Intent
import android.os.Bundle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Tests for [JugglucoBroadcast.parse].
 *
 * Note: requires `unitTests.returnDefaultValues = true` in the module build.gradle
 * because we instantiate stub Bundle/Intent on the JVM without Robolectric.
 */
class JugglucoBroadcastTest {

    @Test
    fun parsesAllExtras() {
        val intent = Intent(JugglucoBroadcast.ACTION).apply {
            putExtra("glucodata.Minute.mgdl", 142)
            putExtra("glucodata.Minute.glucose", 7.9f)
            putExtra("glucodata.Minute.Rate", 0.4f)
            putExtra("glucodata.Minute.Time", 1_700_000_000_000L)
            putExtra("glucodata.Minute.SerialNumber", "0FA12345678")
            putExtra("glucodata.Minute.Alarm", 0)
        }
        val r = JugglucoBroadcast.parse(intent)
        requireNotNull(r)
        assertEquals(142, r.mgdl)
        assertEquals(7.9f, r.glucose, 0.001f)
        assertEquals(0.4f, r.rate, 0.001f)
        assertEquals(1_700_000_000_000L, r.timeMs)
        assertEquals("0FA12345678", r.serial)
        assertEquals(0, r.alarm)
    }

    @Test
    fun rejectsWrongAction() {
        val intent = Intent("com.other.action").apply {
            putExtra("glucodata.Minute.mgdl", 100)
            putExtra("glucodata.Minute.Time", 123L)
        }
        assertNull(JugglucoBroadcast.parse(intent))
    }

    @Test
    fun rejectsMissingMgdl() {
        val intent = Intent(JugglucoBroadcast.ACTION).apply {
            putExtra("glucodata.Minute.Time", 1L)
        }
        assertNull(JugglucoBroadcast.parse(intent))
    }

    @Test
    fun rejectsZeroOrNegativeMgdl() {
        val intent = Intent(JugglucoBroadcast.ACTION).apply {
            putExtra("glucodata.Minute.mgdl", 0)
            putExtra("glucodata.Minute.Time", 1L)
        }
        assertNull(JugglucoBroadcast.parse(intent))
    }

    @Test
    fun rejectsMissingTimestamp() {
        val intent = Intent(JugglucoBroadcast.ACTION).apply {
            putExtra("glucodata.Minute.mgdl", 100)
        }
        assertNull(JugglucoBroadcast.parse(intent))
    }

    @Test
    fun fallsBackToDefaultsForOptionalExtras() {
        val intent = Intent(JugglucoBroadcast.ACTION).apply {
            putExtra("glucodata.Minute.mgdl", 110)
            putExtra("glucodata.Minute.Time", 1_700_000_000_000L)
        }
        val r = JugglucoBroadcast.parse(intent)
        requireNotNull(r)
        assertEquals(110, r.mgdl)
        assertEquals(110.0f, r.glucose, 0.001f) // falls back to mgdl
        assertEquals(0.0f, r.rate, 0.001f)
        assertEquals("", r.serial)
        assertEquals(0, r.alarm)
    }
}
