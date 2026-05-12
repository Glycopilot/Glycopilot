# Glycopilot — Guide de setup patient (Libre 2+)

> Procédure d'installation et d'activation pour un patient qui équipe son
> téléphone Android pour la première fois avec un capteur **FreeStyle Libre 2 Plus**.
> Suivre les étapes dans l'ordre. Toutes les étapes ne sont à faire qu'**une
> seule fois**, sauf indication contraire.

## Prérequis matériel

- Un téléphone **Android** (NFC + Bluetooth 4.0+, soit la quasi-totalité des
  modèles depuis 2018)
- Un kit **FreeStyle Libre 2 Plus** : 1 capteur + 1 applicateur (boîte standard
  pharmacie)
- Une connexion Internet active pour l'installation et le compte LibreLink

---

## Setup initial — 10 à 15 minutes, une seule fois

### 1. Téléchargement des trois applications

Le patient installe :

| App | Source | Rôle |
|---|---|---|
| **FreeStyle LibreLink** | Google Play Store | Active le capteur. Obligatoire une fois. |
| **Juggluco** | [F-Droid](https://f-droid.org/) ou [APK officiel](https://www.juggluco.nl/Juggluco/) | Pont BLE entre le capteur et Glycopilot. Tourne en arrière-plan. |
| **Glycopilot** | Lien d'installation interne | Interface patient + remontée des données aux médecins. |

> **Pourquoi trois apps ?** LibreLink est imposée par Abbott pour activer le
> Libre 2+. Juggluco lit ensuite le BLE du capteur et le fait passer à Glycopilot
> via le système d'événements Android — le patient ne l'ouvre jamais après le
> setup.

### 2. Création du compte LibreLink — 3 minutes

1. Ouvrir **LibreLink**
2. "S'inscrire" → renseigner email, mot de passe, date de naissance, pays
3. Confirmer le compte via le lien reçu par email
4. Se connecter

> Ce compte ne sert qu'à l'activation. Le patient n'aura plus besoin de s'y
> reconnecter par la suite.

### 3. Pose physique du capteur — 2 minutes

1. Choisir une zone : arrière du bras (recommandé) ou abdomen.
2. Nettoyer la peau avec une lingette alcoolisée, laisser sécher.
3. Décoller le capteur de son emballage.
4. Appliquer l'applicateur sur la peau, presser fermement → un "clic" indique
   l'insertion du filament sous l'épiderme.
5. Retirer l'applicateur (à jeter).
6. Vérifier que le boîtier blanc est bien collé et plat.

### 4. Activation du capteur via LibreLink — 3 minutes

1. Ouvrir **LibreLink**
2. Taper "Démarrer un nouveau capteur"
3. Approcher le **dos du téléphone** (zone NFC, généralement haut du dos) du capteur posé sur le bras
4. Tenir 1-2 secondes jusqu'au signal sonore / vibration
5. LibreLink confirme l'activation et démarre **la phase de chauffe d'1 heure**

> **Pendant cette heure de chauffe**, aucune application ne peut lire de
> glycémie — c'est physiologique, le filament doit s'équilibrer avec le liquide
> interstitiel sous la peau. Le patient peut continuer le setup pendant ce
> temps, les valeurs commenceront à apparaître après ces 60 minutes.

### 5. Configuration de Juggluco — 3 minutes

1. Ouvrir **Juggluco**
2. Menu (☰ en haut à gauche) → **Paramètres**
3. Section **Échange de données** → **LibreView**
4. Renseigner les **mêmes identifiants** que ceux du compte LibreLink créé à l'étape 2
5. Taper **Récupérer l'ID du compte** — un identifiant numérique apparaît
6. Revenir à l'écran principal de Juggluco
7. Approcher à nouveau le **dos du téléphone** du capteur → **scan NFC** avec Juggluco

À cet instant, Juggluco prend la main sur le flux BLE du capteur. La connexion
peut prendre 2 à 10 minutes pour s'établir la première fois. Une fois établie,
Juggluco affiche les valeurs de glycémie en direct.

### 6. Connexion de Glycopilot à Juggluco — 1 minute

1. Ouvrir **Glycopilot**
2. Se connecter avec les identifiants Glycopilot (compte patient existant)
3. Aller dans le menu → **Connecter votre capteur**
4. Taper **Activer la surveillance**

Glycopilot s'abonne au flux d'événements de Juggluco. Aucune action supplémentaire
côté patient. Quand la phase de chauffe Libre est terminée, la valeur courante
apparaît sur l'écran d'accueil de Glycopilot, et est automatiquement transmise
au backend (les médecins du patient la voient en temps réel).

---

## Au quotidien — pendant les 14 jours suivants

Une fois le setup fait, le patient n'a plus aucune action récurrente :

- **Téléphone en poche** : Juggluco écoute le BLE en arrière-plan, Glycopilot
  reçoit les valeurs.
- **Ouvrir Glycopilot** quand le patient veut consulter sa glycémie, voir son
  historique, recevoir des alertes hypo/hyper.
- **Ne plus toucher** à LibreLink ni Juggluco.

Une notification persistante "Surveillance glycémique active" reste affichée
dans la barre de notification Android : c'est le service en arrière-plan
nécessaire pour maintenir la connexion BLE quand l'écran est verrouillé. Le
patient peut la masquer mais pas la désactiver.

---

## Renouvellement du capteur — tous les 14 jours

Quand le capteur arrive en fin de vie (Glycopilot et Juggluco affichent un
avertissement à 24h de la fin), le patient doit recommencer **uniquement**
les étapes 3, 4 et 5 :

3. Pose physique d'un nouveau capteur sur une zone différente
4. Activation via LibreLink (scan NFC)
5. Bascule vers Juggluco (scan NFC) — pas besoin de re-rentrer les identifiants
   LibreLink, ils sont déjà enregistrés

Soit ~7 minutes par renouvellement.

L'étape 6 (Glycopilot) n'est pas à refaire : Glycopilot bascule automatiquement
sur le nouveau capteur dès que Juggluco commence à émettre des données.

---

## Dépannage rapide

### Glycopilot n'affiche aucune valeur

1. Vérifier que **Juggluco affiche une valeur courante** sur son écran principal.
   Si non, le problème est entre le capteur et Juggluco (BLE) — re-scanner NFC
   le capteur avec Juggluco.
2. Vérifier que la **notification "Surveillance glycémique active"** est
   présente. Si non, rouvrir Glycopilot → écran capteur → "Activer la surveillance".
3. Vérifier que **le Bluetooth est activé** sur le téléphone.

### Le scan NFC ne marche pas

1. Vérifier que la **NFC est activée** : Réglages Android → Connexions → NFC.
2. La zone NFC du téléphone est généralement **au dos, en haut**. Sur certains
   modèles, c'est au centre. Tester plusieurs positions.
3. Retirer la coque si elle est épaisse ou métallique.

### LibreLink réclame une mise à jour

Mettre à jour LibreLink via le Play Store, recommencer le setup à l'étape 4.
Juggluco et Glycopilot ne sont pas affectés.

### Mon téléphone redémarre

Aucune action requise. Juggluco redémarre automatiquement (foreground service)
et Glycopilot se reconnecte aux événements dès qu'il est rouvert.

---

## Pourquoi cette architecture ? — Note pour le jury / la soutenance

Glycopilot adopte une **séparation des préoccupations** entre la couche
matérielle (gérée par Juggluco, projet open source mature qui supporte 6+
modèles de capteurs différents : Libre 1/2/2+/3/3+, Dexcom G7, Sibionics,
AccuChek SmartGuide) et la couche métier (Glycopilot, qui se concentre sur
l'expérience patient et la communication médecin-patient).

Cette approche nous permet :
- de **supporter dès aujourd'hui plusieurs marques de capteurs** sans dupliquer
  du code BLE/NFC propriétaire pour chaque
- de **rester focus sur le métier** (UX, alertes, dossier médical, communication
  équipe soignante)
- de **bénéficier des mises à jour de protocole** que la communauté Juggluco
  pousse régulièrement quand un fabricant modifie un firmware
