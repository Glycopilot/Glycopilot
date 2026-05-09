# FreeStyle Libre 2 (NON-Plus) — Protocol Reimplementation Reference

> ## ⚠️ Document archivé — non utilisé par l'implémentation actuelle
>
> Ce document décrit la stratégie **abandonnée** où Glycopilot parlait
> directement au capteur Libre 2 (non-Plus) en BLE+NFC, sans dépendance tierce.
> Cette stratégie supposait l'achat d'un capteur Libre 2 standard, qui s'est
> avéré indisponible (arrêt commercialisation France septembre 2025, stock
> résiduel insuffisant).
>
> **Stratégie actuellement implémentée** : pont vers l'app open source
> Juggluco qui gère le BLE+NFC pour nous. Voir
> [`PATIENT_SETUP.md`](./PATIENT_SETUP.md) pour le flow patient et le module
> `frontend/modules/libre2-cgm/` (package `juggluco/`) pour l'implémentation.
>
> Ce doc reste utile comme **référence de fond** : il documente ce qu'on
> aurait codé si Libre 2 standard était disponible, et reste valide si le
> projet évolue vers du reverse direct du firmware Libre.
>
> ---

> Référence technique interne pour réimplémenter le protocole NFC + BLE du capteur
> FreeStyle Libre 2 (modèle 14 jours, non-Plus) dans un module Android natif Kotlin.
>
> Ce document est une synthèse rédigée à partir du code open source xDrip+
> (GPL-3) et de LibreTransmitter / LoopKit (MIT). **Aucun code n'a été copié** :
> seules les algos / structures / constantes (non copyrightables) sont reprises.

---

## 0. Note source-of-truth

xDrip+ ne contient **pas** la crypto Libre 2 elle-même : le calcul du payload de
déverrouillage NFC et la décryption BLE sont délégués à un helper closed-source
(`LibreOOPAlgorithm.apk`). L'équivalent open-source complet vit dans
**LibreTransmitter** (Swift, originellement `dabear/LibreTransmitter`, repris par
`LoopKit/LibreTransmitter`).

Fichiers utiles à garder ouverts :

- xDrip+ : `app/src/main/java/com/eveningoutpost/dexdrip/NFCReaderX.java`
  → séquence NFC, envoi des commandes ISO-15693
- xDrip+ : `app/src/main/java/com/eveningoutpost/dexdrip/utilitymodels/LibreUtils.java`
  → CRC-16, décodage du serial
- LibreTransmitter : `Bluetooth/Transmitter/Libre2DirectTransmitter.swift`
  → flow GATT complet (scan, advertise filter, write/notify)
- LibreTransmitter : `LibreSensor/SensorPairing/SensorPairingService.swift`
  → séquence d'activation NFC
- LibreTransmitter : `LibreSensor/SensorContents/PreLibre2.swift`
  → la crypto (`processCrypto`, `prepareVariables`, `usefulFunction`,
    `streamingUnlockPayload`, `decryptBLE`, `parseBLEData`, `decryptFRAM`)
- LibreTransmitter : `LibreSensor/SensorContents/CRC.swift`

---

## 1. Activation NFC (ISO-15693)

Tag NXP-style ISO-15693 dans le patch. Manufacturer code `0x07` (Abbott).

### 1.1 Constantes

```
Manufacturer code:           0x07          (= patchUid[6])
Request flags (xDrip+):      0x02          (high data rate, no addressing)
Custom cmd — Get Patch Info: 0xA1
Custom cmd — Read Multi:     0xB3          (LibreTransmitter ; xDrip+ 0x23 standard aussi)
Custom cmd — Backdoor:       0xA4          param "deadbeef" (UTF-8)
Custom cmd — Write Lock:     0xA2
Custom cmd — BLE Streaming:  0xA1 + sous-commande 0x1E
                             (autres : 0x1A, 0x1B activate, 0x1C, 0x1D, 0x1F)
```

### 1.2 Séquence (cf. `NFCReaderX.startLibre2Streaming` et `SensorPairingService`)

```
1. Connect NfcV (ISO-15693).
2. uid8        = tag.getId()                  // 8 octets, LSB-first
   manufacturer = uid8[6]                     // doit valoir 0x07
3. GetPatchInfo:
       cmd  = [0x02, 0xA1, manufacturer]
       resp = transceive(cmd)
   patchInfo = resp[1..]                      // strip leading status byte
   Pour Libre 2 (non-Plus) patchInfo ≈ 6 octets ; les 2 premiers identifient
   le type (ex. 0x9D 0x08, 0xE5 0x00, 0x76 0x00 selon génération).
4. Construire le payload de streaming-unlock (cf. §2) :
       streamPayload = streamingUnlockPayload(uid8, patchInfo, op=0x1E, unlockCount)
5. Envoyer l'activation :
       full  = [0x02, 0xA1, manufacturer] || streamPayload
       resp2 = transceive(full)               // longueur totale 7 octets en réponse
       resp2[0]    = status
       resp2[1..7] = MAC (renversée)
6. macAddress = reverse(resp2[1..7])         // formatée XX:XX:XX:XX:XX:XX
7. Persister {uid8, patchInfo, mac, unlockCount+1} pour la phase BLE.
```

### 1.3 Timing / retry

- xDrip+ utilise un timeout transceive **2000 ms**.
- Retry interval **100 ms**, 3 tentatives typiques.
- Le tag DOIT rester couplé au téléphone pour tout l'échange (~1 s réel).
- Validation : `LibreUtils.verify()` vérifie le CRC-16 sur les ranges FRAM
  `[0..24]`, `[24..320]`, `[320..344]` si on lit la FRAM complète.

---

## 2. Dérivation de clé / payload de déverrouillage

C'est le cipher commun à la commande NFC `0x1E` ET au keystream BLE.
xDrip+ délègue à `LibreOOPAlgorithm.nfcSendgetBluetoothEnablePayload(...)`.
Référence open source : `PreLibre2.swift`.

### 2.1 Entrées

- `id[8]` — UID 8 octets du tag NFC.
- `info[6]` — patch-info renvoyés par `0xA1`.
- `unlockCount` — compteur 16 bits little-endian, +1 à chaque unlock NFC
  (DOIT être persisté).
- `enableTime = 42` — constante magique (Loop l'appelle `enableTime`/`unlockCode`).

### 2.2 Bloc cipher `processCrypto`

**Pas AES.** Cipher custom Feistel-like 8 rounds sur un état 4×UInt16.

```
const KEY[4] = { 0xA0C5, 0x6860, 0x0000, 0x14C6 }   // baked-in

function processCrypto(input[4] of UInt16) -> output[4] of UInt16:
    s = copy(input)
    repeat 8 rounds:
        for i in 0..3:
            tmp = (s[i] >> 2) | (s[i] << 14)
            if (s[i] & 1) tmp ^= KEY[(i+1) & 3]
            if (s[i] & 2) tmp ^= KEY[(i+3) & 3]
            s[(i+1) & 3] ^= tmp
    return s
```

(Le pattern de bits exact : voir `PreLibre2.processCrypto` dans LibreTransmitter ;
réimplémenter à partir du spec, pas en copiant.)

### 2.3 `prepareVariables(id, x, y) -> UInt16[4]`

Mélange l'UID 8 octets avec deux mots 16 bits `x` (block index ou tag d'opération)
et `y` (argument contextuel) pour produire l'état initial du cipher :

```
function prepareVariables(id, x, y):
    s0 = u16(id[0..1])
    s1 = u16(id[2..3]) ^ x
    s2 = u16(id[4..5]) ^ y
    s3 = u16(id[6..7])
    return [s0, s1, s2, s3]
```

### 2.4 `usefulFunction(id, x, y) -> UInt64`

Wrapper utilisé pour dériver la **graine du keystream** :

```
function usefulFunction(id, x, y):
    s = prepareVariables(id, x, y)
    s[0] ^= 0x4163         // magic
    s[3] ^= 0x4344         // magic
    out = processCrypto(s)
    return packU16x4(out)
```

### 2.5 Streaming unlock payload (commande NFC `0x1E`)

```
function streamingUnlockPayload(id, info, op=0x1E, unlockCount):
    y = u16(info[5], info[4]) XOR 0x44   // pour Libre 2 14-day ; différent libreUS / Pro

    a = processCrypto(prepareVariables(id, x=0x1b, y=0x1b6a))   // activation stage
    b = processCrypto(prepareVariables(id, x=op,   y=unlockCount))
    crc1 = crc16(a, seed=0xFFFF)
    crc2 = crc16(b, seed=0xFFFF)
    out  = pack( op, unlockCount_le, a_lo, a_hi, crc1, b_lo, b_hi, crc2 )
    // Final 13 octets — ordre exact : streamingUnlockPayload dans PreLibre2.swift
    return out
```

Les 4 « unlock-code bytes » référencés par `SensorPairingService` correspondent à
`unlockCount_le || op || flags`.

### 2.6 Keystream BLE (clé de décryption)

Le cipher tourne **itérativement** sur le buffer BLE. Pas d'AES-128-CBC, pas
d'AES-CCM — c'est le même cipher 16-bit-word en mode counter-like :

```
function decryptBLE(id, encrypted[46]):
    iv_x = u16(encrypted[0..1])         // header word (chiffré)
    iv_y = u16(0x1b, 0x6a) ^ iv_x       // mixing constant de l'étape activation
    state = prepareVariables(id, iv_x, iv_y)
    plain = encrypted[0..2]             // header passe inchangé
    for chunk_idx in 0 .. ceil((46-2)/8) - 1:
        state = processCrypto(state)
        ks    = bytes(state)            // 8 octets de keystream
        plain ||= encrypted[2 + 8*chunk_idx .. +8] XOR ks
    verify_crc16(plain[0..44], expected = u16(plain[44..46]) byteswapped, seed=0xFFFF)
    return plain
```

### 2.7 Sorties / "clés"

Conceptuellement il n'y a qu'**un seul secret** : l'état 4-mots dérivé de
`id` + `info` + le `KEY` baked-in. À partir de là, la même primitive fournit :

- Le **token NFC d'unlock** (envoyé dans la frame `0xA1 0x1E …`).
- Le **keystream de décryption BLE** (driver par le header 2 octets de chaque packet).
- Le **keystream de décryption FRAM** (driver par block index 0..42 avec un
  arg per-sensor-type : `0xCADC` pour libreUS14day blocks 0-2 & 40-42,
  `info[5..4] XOR 0x4444` sinon).

xDrip+ ne stocke pas explicitement de clé ; tout est recalculé depuis
`(uid, patchInfo)` à chaque packet. Pour notre Room/SQLite, garder seulement :
`(uid8, patchInfo[6], unlockCount, mac[6])`.

---

## 3. BLE — discovery, bond, GATT

D'après `Libre2DirectTransmitter.swift` :

| Champ | Valeur |
|---|---|
| Service UUID advertising (16 bits) | `0xFDE3` (Abbott Diabetes Care) |
| Vendor / company ID | `0x03BB` |
| Local name advertisé | `ABBOTT<serial>` (filtre case-insensitive `abbott*` OU `address == storedMac`) |
| Service primaire GATT | `0000FDE3-0000-1000-8000-00805F9B34FB` |
| Caractéristique write | `0000F001-0000-1000-8000-00805F9B34FB` (write-with-response) |
| Caractéristique notify | `0000F002-0000-1000-8000-00805F9B34FB` (indicate ; CCCD à activer) |
| Bonding | **Requis.** Secure-connection bond, sans PIN — Just-Works initiée auto sur le 1er write F001. Certaines stacks Android nécessitent `device.createBond()` explicite avant `connectGatt`. |
| Intervalle advertise | ~3 min ; les data glucose arrivent toutes les 1 min après connexion. |
| MTU | 23 par défaut suffit (frames ≤ 20 octets) ; LibreTransmitter ne demande pas de MTU plus large. |

Logique de match :

```
onScanResult(result):
    name = result.device.name OR result.scanRecord.deviceName
    if name == null: return
    if !(name.toLowerCase().startsWith("abbott") || result.device.address == storedMac): return
    stopScan()
    device.createBond()
    device.connectGatt(...)
```

---

## 4. Handshake d'authentification BLE

**Pas de challenge/response après connect** — l'authentification a déjà été
prouvée par l'étape NFC : le sensor n'accepte une connexion BLE que d'un peer
qui détient la MAC retournée par `0xA1 0x1E …`. Le 1er write BLE va donc
directement à « delivre les data glucose ».

Flow réel :

```
1. GATT connect à ABBOTT<serial>.
2. Discover services. Confirmer présence de 0xFDE3.
3. Activer indications sur F002 (write CCCD = 0x02 0x00).
4. Write 20 octets streaming-unlock sur F001 :
       payload = streamingUnlockPayload(uid, patchInfo, op=0x1E, unlockCount=storedCount)
       storedCount += 1   // persister AVANT le write au cas où un retry se produit
5. Le sensor répond par INDICATIONs successives sur F002.
   Payload total assemblé en 46 octets (Libre 2 non-Plus : 20 + 18 + 8 typique,
   dernière frame variable).
6. Caller decryptBLE(uid, 46_bytes) → 46 octets plain (incl. CRC-16 trailer).
7. parseBLEData(plain, serial) → 1 measurement actuel + 9 trend/history.
```

**Pas d'AES-128-CBC ni AES-CCM.** La crypto est le cipher custom de §2.
La « session key » est l'état 4-mots dérivé de `(uid, patchInfo, headerWord)` ;
il est reseed par les 2 premiers octets cleartext du header de **chaque** packet,
donc pas de session longue durée — chaque packet est décryptable indépendamment.

Si `decryptBLE` CRC fail → drop le packet, **ne pas retry** l'unlock (consommerait
un autre `unlockCount`).

---

## 5. Format du packet glucose

### 5.1 Cadence

- Une rafale d'indications toutes les **60 secondes**.
- Chaque rafale livre 46 octets en clair après `decryptBLE`.
- Contenu : 1 mesure courante + 6 trend (par minute, 6 dernières min) + 3 history
  (par 15 min) + sensor age + CRC. (LibreTransmitter découpe à index 7 :
  7 trend, 3 history.)

### 5.2 Layout du plaintext 46 octets

```
Offset  Len   Field
------  ---   ---------------------------------------------
0       2     header chiffré echoed (laissé inchangé par decrypt)
2       4     measurement[0]  glucose courant
6       4     measurement[1]  trend  -1 min
10      4     measurement[2]  trend  -2 min
14      4     measurement[3]  trend  -3 min
18      4     measurement[4]  trend  -4 min
22      4     measurement[5]  trend  -5 min
26      4     measurement[6]  trend  -6 min
30      4     measurement[7]  history -1
34      4     measurement[8]  history -2
38      4     measurement[9]  history -3
42      2     sensor age (LE UInt16) ; nom code : `wearTimeMinutes`
44      2     CRC-16 sur [0..44], seed 0xFFFF, byte-swapped on the wire
```

### 5.3 Field measurement 4 octets (bitfield little-endian)

```
bits  0..13  (14)  raw glucose reading       (counts ADC sensor)
bits 14..25  (12)  raw temperature reading
bits 26..30  ( 5)  temperature adjustment
bit  31      ( 1)  has-error / sign flag
```

Conversion en mg/dL (matche la voie uncalibrated AndroidAPS / xDrip+) :

```
mgdl = round(raw_glucose / 8.5)
mmol = mgdl / 18.0182
```

(8.5 = facteur empirique utilisé par LibreTransmitter et OOP2 ; pas une
constante manufacturer-published — le reader Libre applique en plus une
calibration per-sensor + correction OOP.)

Une mesure avec `bit31 == 1` ou `raw_glucose == 0` DOIT être ignorée.

### 5.4 Timestamps

- Le timestamp de la "current" est `sensorStartTime + wearTimeMinutes` minutes
  (avec `sensorStartTime` capturé quand notre app voit le sensor pour la 1ère fois).
- Trend points : `t - i` minutes pour `i = 1..6`.
- History : `t - 15*j` minutes pour `j = 1..3`, snappés sur la grille 15 min.

### 5.5 CRC

```
CRC-16/CCITT-FALSE
poly=0x1021  init=0xFFFF  refin=false  refout=false  xorout=0x0000
```

Calculé sur `plain[0..44]`, valeur attendue = `byteswap(u16(plain[44..46]))`.

Le même `crc16` est utilisé 3 fois : streaming-unlock-payload, et FRAM verify
(`LibreUtils.verify`).

---

## 6. Persistence (schéma Room recommandé)

```kotlin
sensors (
  serial      TEXT PRIMARY KEY,        // décodé d'uid8 avec alphabet base32 Abbott
  uid         BLOB(8),
  patch_info  BLOB(6),
  mac         BLOB(6),
  unlock_count INT,                    // monotone, persister AVANT le write NFC
  start_time  INT,                     // ms epoch, set au 1er packet BLE reçu
)
glucose_readings (
  ts INT, raw INT, mgdl REAL, kind INT, sensor TEXT REFERENCES sensors
)
```

Décodage du serial à partir d'`uid8` : alphabet base32 custom Abbott
`0123456789ACDEFGHJKLMNPQRTUVWXYZ` sur `uid8[2..8]` reversed ;
implémentation xDrip+ : `LibreUtils.decodeSerialNumber()`.

---

## 7. Open questions / à vérifier sur hardware

1. **Bit layout exact de `processCrypto`** — la description §2.2 capture la
   structure, mais le rotation count, le pattern XOR conditionnel et le round
   count doivent être validés contre `PreLibre2.swift` pendant l'écriture des
   test vectors. Le repo a des vectors en bas du fichier ; les réutiliser
   (vectors non copyrightables) pour valider.
2. **Longueur patchInfo pour les lots Libre 2 récents (non-Plus)** — la majorité
   renvoie 6 octets, certains 17/24/28 (xDrip+ a un discriminateur length-based).
   À confirmer sur ton sensor de test.
3. **`getArg(blockIndex)` pour décrypt FRAM** — `0xCADC` pour libreUS14day
   blocks 0-2 & 40-42, `info[5..4] XOR 0x4444` sinon. Possiblement une 3e
   variante "Libre 2 14-day non-US" non identifiée.
4. **Bonding sur Android 13+** — LoopKit iOS utilise Just-Works auto. Sur
   Android, certains Samsung nécessitent `BluetoothDevice.createBond()` explicite
   et un délai 1-2 s avant le 1er write F001 ; les Pixel acceptent inline.
   Tester sur les 2.
5. **Le sensor reset-il `unlockCount` après power-cycle ?** — Reverse engineering
   dit non ; le compteur est enforced server-side (dans le patch). Si le phone
   perd le compteur, l'utilisateur doit re-scanner NFC pour resync. À confirmer
   en faisant intentionnellement un rollback et en watchant les error frames `0x0F`.
6. **Boundaries des indication packets** — plaintext total = 46 octets, mais le
   chunking varie (`20+18+8`, `20+20+6`). La réimplémentation DOIT buffer les
   indications F002 et ne tenter `decryptBLE` qu'une fois 46 octets accumulés.
   Vérifier avec `btsnoop_hci.log`.
7. **Facteur conversion glucose 8.5** — empirique. Cross-check avec un reader
   Libre sur le même sensor sur 24h ; attendre ±3 mg/dL avant compensation
   température.
8. **Ordre des octets NFC-unlock xDrip+** — `nfcSendgetBluetoothEnablePayload()`
   étant closed-source, l'ordre `[op, unlockCount_le, a_lo, a_hi, crc1, b_lo, b_hi, crc2]`
   est reconstruit depuis LibreTransmitter. Si le sensor renvoie `0x0F` sur le
   transceive d'activation, byte-swap chaque `u16` et retry.
9. **Libre 2+ vs Libre 2 (ce doc couvre UNIQUEMENT Libre 2 14-day non-Plus)** —
   Libre 2+ utilise des bytes patch-info supplémentaires et un `getArg`
   différent ; ne pas réutiliser ce spec là-bas.

---

## Sources

- [xDrip — NFCReaderX.java](https://github.com/NightscoutFoundation/xDrip/blob/master/app/src/main/java/com/eveningoutpost/dexdrip/NFCReaderX.java)
- [xDrip — Libre2Sensor.java](https://github.com/NightscoutFoundation/xDrip/blob/master/app/src/main/java/com/eveningoutpost/dexdrip/Models/Libre2Sensor.java)
- [xDrip — LibreUtils.java](https://github.com/NightscoutFoundation/xDrip/blob/master/app/src/main/java/com/eveningoutpost/dexdrip/utilitymodels/LibreUtils.java)
- [LoopKit / LibreTransmitter (référence crypto open source)](https://github.com/LoopKit/LibreTransmitter)
- [dabear / LibreTransmitter (original archivé)](https://github.com/dabear/LibreTransmitter)
- [Flameeyes — FreeStyle Libre 2 encrypted protocol notes](https://flameeyes.blog/2020/01/30/freestyle-libre-2-encrypted-protocol-notes/)
- [Ctrl blog — Bluetooth privacy and the FreeStyle Libre 2](https://www.ctrl.blog/entry/freestyle-libre2-ble-privacy.html)
- [AndroidAPS — Libre 2 hardware page](https://androidaps.readthedocs.io/en/latest/Hardware/Libre2.html)
- [glucometers-tech — Libre 2 protocol issue thread](https://github.com/glucometers-tech/glucometer-protocols/issues/8)
- [RHSaliya / Libre2NFCReader (référence Java NFC)](https://github.com/RHSaliya/Libre2NFCReader)
