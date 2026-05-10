package expo.modules.libre2cgm

import android.content.Context
import android.os.Bundle
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.libre2cgm.ble.Libre2ForegroundService
import expo.modules.libre2cgm.juggluco.JugglucoBroadcast
import expo.modules.libre2cgm.juggluco.JugglucoReceiver

/**
 * Bridge between Glycopilot JS and the Juggluco companion app.
 *
 * Juggluco emits a `glucodata.Minute` broadcast every minute with the latest
 * glucose reading. The receiver is declared statically in
 * AndroidManifest.xml so Juggluco can enumerate Glycopilot in its
 * "Glucodata broadcast" recipient picker; this module just plugs a runtime
 * handler onto [JugglucoReceiver] to forward events to JS.
 *
 * JS API:
 *   - `isJugglucoInstalled()` → boolean
 *   - `startListening()` → install handler + foreground service
 *   - `stopListening()`  → remove handler + stop foreground service
 *   - event `onGlucoseReading` → { mgdl, glucose, rate, timeMs, serial, alarm }
 */
class Libre2CgmModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("Libre2Cgm")

        Events(EVENT_GLUCOSE_READING, EVENT_LISTENING_STATE)

        Function("hello") { "Hello from Libre2Cgm native module!" }

        Function("isJugglucoInstalled") {
            val ctx = appContext.reactContext ?: return@Function false
            isJugglucoInstalled(ctx)
        }

        AsyncFunction("startListening") { promise: Promise ->
            val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
            // Idempotent — re-attaching the same handler is harmless.
            JugglucoReceiver.handler = { reading ->
                sendEvent(EVENT_GLUCOSE_READING, reading.toBundle())
            }
            Libre2ForegroundService.start(ctx)
            sendEvent(EVENT_LISTENING_STATE, Bundle().apply { putBoolean("listening", true) })
            promise.resolve(isJugglucoInstalled(ctx))
        }

        AsyncFunction("stopListening") { promise: Promise ->
            val ctx = appContext.reactContext
            JugglucoReceiver.handler = null
            if (ctx != null) Libre2ForegroundService.stop(ctx)
            sendEvent(EVENT_LISTENING_STATE, Bundle().apply { putBoolean("listening", false) })
            promise.resolve(null)
        }

        OnActivityDestroys {
            val ctx = appContext.reactContext ?: return@OnActivityDestroys
            JugglucoReceiver.handler = null
            Libre2ForegroundService.stop(ctx)
        }
    }

    private fun isJugglucoInstalled(ctx: Context): Boolean {
        return try {
            ctx.packageManager.getPackageInfo(JugglucoBroadcast.PACKAGE, 0)
            true
        } catch (e: Throwable) {
            false
        }
    }

    private fun JugglucoBroadcast.Reading.toBundle(): Bundle = Bundle().apply {
        putInt("mgdl", mgdl)
        putDouble("glucose", glucose.toDouble())
        putDouble("rate", rate.toDouble())
        putDouble("timeMs", timeMs.toDouble())
        putString("serial", serial)
        putInt("alarm", alarm)
    }

    companion object {
        private const val EVENT_GLUCOSE_READING = "onGlucoseReading"
        private const val EVENT_LISTENING_STATE = "onListeningStateChanged"
    }
}
