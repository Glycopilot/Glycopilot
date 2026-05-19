package expo.modules.libre2cgm.juggluco

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Small persistent buffer for Juggluco readings received while the JS bridge is
 * not attached. Once JS starts listening again, Libre2CgmModule drains this
 * buffer and lets the regular JS upload queue handle network failures.
 */
object JugglucoReadingStore {
    private const val PREFS_NAME = "libre2_cgm"
    private const val KEY_BUFFERED_READINGS = "buffered_juggluco_readings"
    private const val MAX_BUFFERED_READINGS = 500

    fun append(context: Context, reading: JugglucoBroadcast.Reading) {
        val readings = read(context).toMutableList()
        readings.add(reading)
        write(context, readings.takeLast(MAX_BUFFERED_READINGS))
    }

    fun drain(context: Context): List<JugglucoBroadcast.Reading> {
        val readings = read(context)
        if (readings.isNotEmpty()) {
            prefs(context).edit().remove(KEY_BUFFERED_READINGS).apply()
        }
        return readings
    }

    private fun read(context: Context): List<JugglucoBroadcast.Reading> {
        val raw = prefs(context).getString(KEY_BUFFERED_READINGS, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val mgdl = item.optInt("mgdl", -1)
                    val timeMs = item.optLong("timeMs", 0L)
                    if (mgdl <= 0 || timeMs == 0L) continue
                    add(
                        JugglucoBroadcast.Reading(
                            mgdl = mgdl,
                            glucose = item.optDouble("glucose", mgdl.toDouble()).toFloat(),
                            rate = item.optDouble("rate", 0.0).toFloat(),
                            timeMs = timeMs,
                            serial = item.optString("serial", ""),
                            alarm = item.optInt("alarm", 0),
                        )
                    )
                }
            }
        } catch (_: Throwable) {
            emptyList()
        }
    }

    private fun write(context: Context, readings: List<JugglucoBroadcast.Reading>) {
        val array = JSONArray()
        readings.forEach { reading ->
            array.put(
                JSONObject()
                    .put("mgdl", reading.mgdl)
                    .put("glucose", reading.glucose.toDouble())
                    .put("rate", reading.rate.toDouble())
                    .put("timeMs", reading.timeMs)
                    .put("serial", reading.serial)
                    .put("alarm", reading.alarm)
            )
        }
        prefs(context).edit().putString(KEY_BUFFERED_READINGS, array.toString()).apply()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
