package expo.modules.libre2cgm.juggluco

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * BroadcastReceiver for Juggluco's `glucodata.Minute` intent.
 *
 * Declared statically in the module's AndroidManifest.xml so Juggluco can
 * enumerate Glycopilot in its "Glucodata broadcast" recipient list (Juggluco
 * uses PackageManager.queryBroadcastReceivers to find candidate apps). A
 * statically declared receiver MUST have a no-arg constructor, so the runtime
 * listener is plugged in via [Companion.handler] which
 * [expo.modules.libre2cgm.Libre2CgmModule] sets when JS calls `startListening`.
 */
class JugglucoReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val reading = JugglucoBroadcast.parse(intent) ?: return
        handler?.invoke(reading)
    }

    companion object {
        /**
         * Set by the Expo module while the JS layer wants to receive readings.
         * Cleared on `stopListening` / activity destroy. If null when a
         * broadcast arrives, the reading is silently dropped — that's fine,
         * Juggluco will broadcast again next minute.
         */
        @Volatile
        var handler: ((JugglucoBroadcast.Reading) -> Unit)? = null
    }
}
