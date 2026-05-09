package expo.modules.libre2cgm.juggluco

import android.content.Intent

/**
 * Constants and parsing helpers for the broadcasts emitted by the Juggluco
 * Android app (`tk.glucodata`).
 *
 * Reference: https://www.juggluco.nl/Juggluco/glucosebroadcast.html
 *
 * Juggluco broadcasts two equivalent intents every minute as long as it has
 * a connection to a sensor:
 *  - `glucodata.Minute` (native Juggluco format)
 *  - `com.eveningoutpost.dexdrip.BgEstimate` (xDrip+ compatible format)
 *
 * We listen to the native one because the schema is stable and well documented.
 */
object JugglucoBroadcast {
    const val ACTION = "glucodata.Minute"
    const val PACKAGE = "tk.glucodata"

    private const val EXTRA_MGDL = "glucodata.Minute.mgdl"
    private const val EXTRA_GLUCOSE = "glucodata.Minute.glucose"
    private const val EXTRA_RATE = "glucodata.Minute.Rate"
    private const val EXTRA_TIME = "glucodata.Minute.Time"
    private const val EXTRA_SERIAL = "glucodata.Minute.SerialNumber"
    private const val EXTRA_ALARM = "glucodata.Minute.Alarm"

    /** Result of parsing a single Juggluco broadcast. */
    data class Reading(
        /** Glucose in mg/dL — primary value Glycopilot persists. */
        val mgdl: Int,
        /** Glucose in the user's display unit (mg/dL or mmol/L). Float. */
        val glucose: Float,
        /** Rate of change, sensor-reported, in mg/dL/min (sign indicates direction). */
        val rate: Float,
        /** Sensor reading timestamp, ms since epoch. */
        val timeMs: Long,
        /** Sensor serial number (printed on the patch). May be empty if Juggluco can't decode it. */
        val serial: String,
        /** Alarm code: 0 = none. Other values are Juggluco-defined alarm states. */
        val alarm: Int,
    )

    /**
     * Parse a [glucodata.Minute] intent into a [Reading], or return null if any
     * required extra is missing.
     */
    fun parse(intent: Intent): Reading? {
        if (intent.action != ACTION) return null
        val extras = intent.extras ?: return null

        val mgdl = if (extras.containsKey(EXTRA_MGDL)) extras.getInt(EXTRA_MGDL, -1) else -1
        if (mgdl <= 0) return null

        val glucose = extras.getFloat(EXTRA_GLUCOSE, mgdl.toFloat())
        val rate = extras.getFloat(EXTRA_RATE, 0f)
        val timeMs = extras.getLong(EXTRA_TIME, 0L)
        if (timeMs == 0L) return null
        val serial = extras.getString(EXTRA_SERIAL, "")
        val alarm = extras.getInt(EXTRA_ALARM, 0)

        return Reading(
            mgdl = mgdl,
            glucose = glucose,
            rate = rate,
            timeMs = timeMs,
            serial = serial,
            alarm = alarm,
        )
    }
}
