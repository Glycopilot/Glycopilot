package expo.modules.libre2cgm.juggluco

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Forwards a parsed Juggluco reading to the module so it can be sent to JS.
 *
 * The receiver is registered dynamically by [expo.modules.libre2cgm.Libre2CgmModule]
 * when JS calls `startListening` and unregistered on `stopListening` /
 * activity teardown — we don't expose it via the manifest because we want
 * lifecycle to follow the JS layer rather than being always-on.
 */
class JugglucoReceiver(
    private val onReading: (JugglucoBroadcast.Reading) -> Unit,
) : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val reading = JugglucoBroadcast.parse(intent) ?: return
        onReading(reading)
    }
}
