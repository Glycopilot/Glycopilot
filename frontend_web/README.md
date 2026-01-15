# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)




# 🏥 Guide du Dashboard Médical GlycoPilot

## 📋 Vue d'ensemble

Le **HomeScreen Medical** est un tableau de bord pour les médecins qui surveillent l'état de santé de leurs patients diabétiques. Les patients utilisent une application mobile connectée à un capteur qui mesure leur glycémie en temps réel.

## ✨ Fonctionnalités principales

### 1. 📊 Statistiques en temps réel
- **Nombre total de patients** suivis
- **Patients en situation critique** (glycémie trop haute ou trop basse)
- **Observance moyenne** des traitements médicamenteux
- **Alertes non lues** pour toute l'équipe médicale

### 2. 🔍 Recherche et filtres
- **Recherche par nom** : Trouve rapidement un patient spécifique
- **Filtres intelligents** :
  - Tous les patients
  - Patients en situation critique
  - Patients avec glycémie normale

### 3. 👥 Cartes patients détaillées

Chaque carte patient affiche :

#### Informations de base
- Nom, prénom et âge
- Avatar avec initiales
- Badge d'alertes non lues

#### Données médicales
- **Glycémie actuelle** en temps réel (g/L)
- **Statut glycémique** avec code couleur :
  - 🔴 **Critique** (> 1.8 g/L) - Rouge
  - 🟠 **Élevé** (1.4 - 1.8 g/L) - Orange
  - 🟢 **Normal** (0.7 - 1.3 g/L) - Vert
  - 🔵 **Bas** (< 0.7 g/L) - Bleu
- **Tendance** (hausse ↗️, baisse ↘️, stable ↔️)
- **Dernière mise à jour** du capteur

#### Observance médicamenteuse
- Barre de progression visuelle
- Pourcentage d'observance (0-100%)
- Code couleur :
  - ≥ 80% : Vert (bonne observance)
  - < 80% : Orange (observance à améliorer)

#### Actions rapides
- **Voir détails** : Accès au dossier complet du patient
- **Prescrire** : Créer une nouvelle prescription

#### Indicateurs supplémentaires
- **Prescriptions en attente** : Nombre de prescriptions non validées par le patient
- **Alertes** : Nombre de notifications non lues

## 🎨 Interface utilisateur

### Header
- Logo GlycoPilot Medical
- Nom du médecin connecté
- Bouton de déconnexion

### Codes couleurs
```
🔴 Critique : #E74C3C (glycémie dangereuse)
🟠 Élevé : #F39C12 (surveillance accrue)
🟢 Normal : #2ECC71 (situation stable)
🔵 Bas : #3498DB (risque d'hypoglycémie)
```

## 📱 Données de démonstration

Le dashboard utilise actuellement des données simulées (mockPatients) pour 5 patients :

1. **Marie Dubois** (45 ans) - Critique, 1.85 g/L
2. **Jean Martin** (62 ans) - Normal, 1.15 g/L
3. **Sophie Bernard** (38 ans) - Bas, 0.65 g/L
4. **Pierre Leroy** (55 ans) - Élevé, 1.45 g/L
5. **Claire Moreau** (41 ans) - Normal, 1.10 g/L

## 🔌 Intégration avec l'API

### Structure des données patient

```javascript
{
  id: 1,
  firstName: 'Marie',
  lastName: 'Dubois',
  age: 45,
  lastGlycemia: 1.85,           // en g/L
  status: 'critical',           // critical, high, normal, low
  trend: 'up',                  // up, down, stable
  lastUpdate: '2 min',          // temps depuis la dernière mesure
  medicationCompliance: 85,     // pourcentage 0-100
  avatar: 'MD',                 // initiales
  pendingPrescriptions: 1,      // nombre
  unreadAlerts: 3              // nombre
}
```

### Endpoints API à créer

```javascript
// services/patientService.js

// Récupérer tous les patients du médecin
GET /api/doctor/patients

// Récupérer les détails d'un patient
GET /api/patients/:id

// Récupérer l'historique glycémique
GET /api/patients/:id/glycemia-history

// Créer une prescription
POST /api/prescriptions
{
  patientId: number,
  medication: string,
  dosage: string,
  frequency: string,
  duration: string,
  notes: string
}

// Récupérer les prescriptions d'un patient
GET /api/patients/:id/prescriptions

// Marquer les alertes comme lues
PUT /api/patients/:id/alerts/read

// Récupérer l'observance médicamenteuse
GET /api/patients/:id/medication-compliance
```

## 🚀 Pour remplacer les données simulées

### 1. Créer le service patient

```javascript
// src/services/patientService.js
import authService from './authService';

const apiClient = authService.getApiClient();

const patientService = {
  // Récupérer tous les patients
  async getPatients() {
    try {
      const response = await apiClient.get('/doctor/patients');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de la récupération des patients');
    }
  },

  // Récupérer les détails d'un patient
  async getPatientDetails(patientId) {
    try {
      const response = await apiClient.get(`/patients/${patientId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de la récupération du patient');
    }
  },

  // Créer une prescription
  async createPrescription(prescriptionData) {
    try {
      const response = await apiClient.post('/prescriptions', prescriptionData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de la création de la prescription');
    }
  }
};

export default patientService;
```

### 2. Modifier le HomeScreen pour utiliser l'API

```javascript
import patientService from './services/patientService';

useEffect(() => {
  const fetchPatients = async () => {
    try {
      const data = await patientService.getPatients();
      setPatients(data);
      setLoading(false);
    } catch (error) {
      toastError('Erreur', error.message);
      setLoading(false);
    }
  };

  if (doctor) {
    fetchPatients();
  }
}, [doctor]);
```

## 📊 Fonctionnalités à implémenter

### 1. Page de détails patient
Créer `PatientDetailsScreen.jsx` avec :
- Graphique d'évolution de la glycémie (24h, 7j, 30j)
- Historique des prescriptions
- Liste des prises médicamenteuses (validées/non validées)
- Alertes et événements
- Notes médicales

### 2. Modal de prescription
Créer `PrescriptionModal.jsx` avec :
- Sélection du médicament
- Dosage et posologie
- Durée du traitement
- Instructions spéciales
- Validation et envoi

### 3. Système d'alertes en temps réel
Utiliser WebSockets pour :
- Mise à jour automatique des glycémies
- Notifications push pour alertes critiques
- Statut de connexion du capteur

### 4. Export de données
- Export PDF du suivi patient
- Rapports mensuels
- Statistiques d'observance

## 🔔 Gestion des alertes

### Types d'alertes

```javascript
const alertTypes = {
  CRITICAL_HIGH: {
    type: 'critical',
    message: 'Glycémie critique élevée',
    threshold: 1.8
  },
  CRITICAL_LOW: {
    type: 'critical',
    message: 'Hypoglycémie',
    threshold: 0.7
  },
  SENSOR_DISCONNECTED: {
    type: 'warning',
    message: 'Capteur déconnecté',
    duration: 30 // minutes
  },
  MISSED_MEDICATION: {
    type: 'info',
    message: 'Médicament non pris',
    scheduled: '09:00'
  }
};
```

## 🎨 Personnalisation

### Modifier les seuils glycémiques

Dans `HomeScreen.jsx`, ajustez les seuils :

```javascript
const getGlycemiaStatus = (value) => {
  if (value >= 1.8) return 'critical';
  if (value >= 1.4) return 'high';
  if (value >= 0.7) return 'normal';
  return 'low';
};
```

### Ajouter des filtres personnalisés

```javascript
const [filterAge, setFilterAge] = useState('all'); // all, <50, 50+

const filteredPatients = patients.filter(patient => {
  // ... autres filtres
  
  const matchesAge = 
    filterAge === 'all' ||
    (filterAge === '<50' && patient.age < 50) ||
    (filterAge === '50+' && patient.age >= 50);
  
  return matchesSearch && matchesFilter && matchesAge;
});
```

## 📱 WebSocket pour temps réel

### Configuration

```javascript
import { useEffect, useRef } from 'react';

const HomeScreen = () => {
  const ws = useRef(null);

  useEffect(() => {
    // Connexion WebSocket
    ws.current = new WebSocket('wss://votre-api.com/ws');

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'GLYCEMIA_UPDATE') {
        // Mettre à jour la glycémie du patient
        setPatients(prev => prev.map(p => 
          p.id === data.patientId 
            ? { ...p, lastGlycemia: data.value, lastUpdate: 'maintenant' }
            : p
        ));
      }
      
      if (data.type === 'ALERT') {
        // Afficher une alerte
        toastWarning('Alerte patient', data.message);
      }
    };

    return () => ws.current?.close();
  }, []);
};
```

## 🔐 Sécurité et confidentialité

### Bonnes pratiques
- ✅ Vérification d'authentification au chargement
- ✅ Protection RGPD des données patients
- ✅ Logs d'accès aux dossiers médicaux
- ✅ Chiffrement des données sensibles
- ✅ Timeout de session automatique
- ✅ Autorisation par rôle (médecin, infirmier, admin)

## 📚 Ressources recommandées

### Bibliothèques utiles

```bash
# Pour les graphiques
npm install recharts

# Pour les WebSockets
npm install socket.io-client

# Pour les dates
npm install date-fns

# Pour les exports PDF
npm install jspdf jspdf-autotable
```

## 🐛 Dépannage

### Les patients ne s'affichent pas
1. Vérifiez que l'utilisateur est bien authentifié
2. Vérifiez les données mockPatients
3. Consultez la console pour les erreurs

### Les couleurs ne correspondent pas
Vérifiez la fonction `getStatusColor()` et les seuils glycémiques

### Le responsive ne fonctionne pas
Vérifiez que `HomeScreen_Medical.css` est bien importé

## 🎯 Feuille de route

- [ ] Intégration API backend
- [ ] Page détails patient
- [ ] Modal de prescription
- [ ] WebSocket temps réel
- [ ] Notifications push
- [ ] Export PDF
- [ ] Graphiques interactifs
- [ ] Multi-langue (FR/EN)
- [ ] Mode sombre
- [ ] Application mobile pour médecins