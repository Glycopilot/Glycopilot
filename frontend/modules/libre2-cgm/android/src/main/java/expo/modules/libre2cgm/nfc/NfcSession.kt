package expo.modules.libre2cgm.nfc

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build

/**
 * Wraps Android's NFC foreground dispatch so the activation UI can be the only
 * consumer of NFC events while it is on screen.
 *
 * Caller flow:
 *   - On screen-enter:  [start] (must be called from the activity's onResume).
 *   - On tag detected:  the activity forwards `onNewIntent(intent)` to [handleNewIntent].
 *   - On screen-exit:   [stop] (must be called from the activity's onPause).
 */
class NfcSession {

    fun interface TagListener {
        fun onTag(tag: Tag)
    }

    private var listener: TagListener? = null

    fun start(activity: Activity, listener: TagListener) {
        val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return
        this.listener = listener

        val intent = Intent(activity, activity.javaClass).apply {
            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE
        } else {
            0
        }
        val pendingIntent = PendingIntent.getActivity(activity, 0, intent, flags)

        val filters = arrayOf(IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED))
        val techLists = arrayOf(arrayOf("android.nfc.tech.NfcV"))

        adapter.enableForegroundDispatch(activity, pendingIntent, filters, techLists)
    }

    fun stop(activity: Activity) {
        val adapter = NfcAdapter.getDefaultAdapter(activity) ?: return
        adapter.disableForegroundDispatch(activity)
        listener = null
    }

    fun handleNewIntent(intent: Intent): Boolean {
        if (intent.action != NfcAdapter.ACTION_TECH_DISCOVERED &&
            intent.action != NfcAdapter.ACTION_TAG_DISCOVERED &&
            intent.action != NfcAdapter.ACTION_NDEF_DISCOVERED
        ) return false

        val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
        }
        val cb = listener ?: return false
        if (tag != null) {
            cb.onTag(tag)
            return true
        }
        return false
    }
}
