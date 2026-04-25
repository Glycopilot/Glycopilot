package expo.modules.libre2cgm.ble

import java.util.UUID

/** GATT identifiers for the FreeStyle Libre 2 sensor. */
object BleConstants {
    /** Abbott Diabetes Care primary service. */
    val SERVICE_UUID: UUID = UUID.fromString("0000FDE3-0000-1000-8000-00805F9B34FB")

    /** Write-with-response characteristic — receives the streaming-unlock payload. */
    val WRITE_CHARACTERISTIC_UUID: UUID = UUID.fromString("0000F001-0000-1000-8000-00805F9B34FB")

    /** Indicate characteristic — emits the encrypted 46-byte glucose packets. */
    val NOTIFY_CHARACTERISTIC_UUID: UUID = UUID.fromString("0000F002-0000-1000-8000-00805F9B34FB")

    /** Standard Bluetooth SIG CCCD descriptor used to enable indications. */
    val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805F9B34FB")

    /** Local-name prefix advertised by Libre 2 sensors. Match is case-insensitive. */
    const val ADVERTISED_NAME_PREFIX = "ABBOTT"
}
