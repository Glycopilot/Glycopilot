package expo.modules.libre2cgm

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
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
 * Glycopilot does not talk to the FreeStyle Libre 2+ sensor directly: the BLE
 * + NFC layer is delegated to Juggluco (an open-source Android app that the
 * patient installs alongside Glycopilot). Juggluco emits a `glucodata.Minute`
 * broadcast every minute with the latest glucose reading. We listen to that
 * broadcast and forward each reading to JS, which posts it to the backend.
 *
 * JS API:
 *   - `isJugglucoInstalled()` → boolean (synchronous check)
 *   - `startListening()` → register the receiver + start foreground service
 *   - `stopListening()`  → unregister + stop foreground service
 *   - event `onGlucoseReading` → reading payload (mgdl, time, serial, …)
 */
class Libre2CgmModule : Module() {

    private var receiver: JugglucoReceiver? = null

    override fun definition() = ModuleDefinition {
        Name("Libre2Cgm")

        Events(EVENT_GLUCOSE_READING, EVENT_LISTENING_STATE)

        // Sanity-check used by smoke tests.
        Function("hello") { "Hello from Libre2Cgm native module!" }

        /** True if the Juggluco package is installed on the device. */
        Function("isJugglucoInstalled") {
            val ctx = appContext.reactContext ?: return@Function false
            isJugglucoInstalled(ctx)
        }

        AsyncFunction("startListening") { promise: Promise ->
            val ctx = appContext.reactContext ?: throw Exceptions.ReactContextLost()
            if (receiver != null) {
                promise.reject("ERR_ALREADY_LISTENING", "Listener already started", null)
                return@AsyncFunction
            }
            val r = JugglucoReceiver { reading -> sendEvent(EVENT_GLUCOSE_READING, reading.toBundle()) }
            val filter = IntentFilter(JugglucoBroadcast.ACTION)
            registerReceiverCompat(ctx, r, filter)
            receiver = r
            Libre2ForegroundService.start(ctx)
            sendEvent(EVENT_LISTENING_STATE, Bundle().apply { putBoolean("listening", true) })
            promise.resolve(isJugglucoInstalled(ctx))
        }

        AsyncFunction("stopListening") { promise: Promise ->
            val ctx = appContext.reactContext
            val r = receiver
            if (ctx != null && r != null) {
                try { ctx.unregisterReceiver(r) } catch (_: IllegalArgumentException) {}
                Libre2ForegroundService.stop(ctx)
            }
            receiver = null
            sendEvent(EVENT_LISTENING_STATE, Bundle().apply { putBoolean("listening", false) })
            promise.resolve(null)
        }

        OnActivityDestroys {
            val ctx = appContext.reactContext ?: return@OnActivityDestroys
            val r = receiver ?: return@OnActivityDestroys
            try { ctx.unregisterReceiver(r) } catch (_: IllegalArgumentException) {}
            Libre2ForegroundService.stop(ctx)
            receiver = null
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

    /**
     * Android 14+ requires a flag on dynamic receivers that listen to broadcasts
     * from other apps; older versions ignore the flag.
     */
    private fun registerReceiverCompat(
        ctx: Context,
        receiver: JugglucoReceiver,
        filter: IntentFilter,
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            ctx.registerReceiver(receiver, filter)
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
