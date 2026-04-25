package expo.modules.libre2cgm.model

/**
 * Result of a successful NFC activation of a Libre 2 sensor.
 *
 * `mac` is the BLE MAC address the sensor will accept connections from.
 * `unlockCount` is the *next* value to use on the next NFC unlock.
 */
data class SensorActivation(
    val uid: ByteArray,
    val patchInfo: ByteArray,
    val mac: ByteArray,
    val serial: String,
    val unlockCount: Int,
) {
    fun macFormatted(): String =
        mac.joinToString(":") { "%02X".format(it.toInt() and 0xFF) }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is SensorActivation) return false
        return uid.contentEquals(other.uid) &&
            patchInfo.contentEquals(other.patchInfo) &&
            mac.contentEquals(other.mac) &&
            serial == other.serial &&
            unlockCount == other.unlockCount
    }

    override fun hashCode(): Int {
        var result = uid.contentHashCode()
        result = 31 * result + patchInfo.contentHashCode()
        result = 31 * result + mac.contentHashCode()
        result = 31 * result + serial.hashCode()
        result = 31 * result + unlockCount
        return result
    }
}
