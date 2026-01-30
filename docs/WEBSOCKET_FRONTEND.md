# WebSocket Glycémie - Guide Frontend

## Connexion

### URL de connexion
```
ws://localhost:8006/ws/glycemia/?token=<JWT_ACCESS_TOKEN>
```

Le token JWT est le même que celui utilisé pour les requêtes API (celui obtenu après login).

### Exemple React Native

```javascript
import { useEffect, useRef, useState } from 'react';

const useGlycemiaWebSocket = (accessToken) => {
  const ws = useRef(null);
  const [lastReading, setLastReading] = useState(null);
  const [alert, setAlert] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    // Connexion WebSocket
    ws.current = new WebSocket(
      `ws://localhost:8006/ws/glycemia/?token=${accessToken}`
    );

    ws.current.onopen = () => {
      console.log('WebSocket connecté');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connection_established':
          console.log('Connexion confirmée:', data.user_id);
          break;

        case 'glycemia_update':
          // Nouvelle mesure reçue
          setLastReading(data.data);
          break;

        case 'glycemia_alert':
          // Alerte hypo ou hyper
          setAlert({
            type: data.alert_type,  // "hypoglycemia" ou "hyperglycemia"
            data: data.data
          });
          break;

        case 'pong':
          // Réponse au ping
          break;
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket déconnecté');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };

    // Cleanup à la déconnexion
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [accessToken]);

  // Fonction pour envoyer un ping (vérifier si la connexion est vivante)
  const sendPing = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  return { isConnected, lastReading, alert, sendPing };
};

export default useGlycemiaWebSocket;
```

---

## Messages reçus

### 1. `connection_established`
Reçu juste après la connexion.

```json
{
  "type": "connection_established",
  "message": "Connected to glycemia WebSocket",
  "user_id": "5ef4bb46-931b-48c8-89b4-f1781e39d465"
}
```

### 2. `glycemia_update`
Reçu à chaque nouvelle mesure de glycémie.

```json
{
  "type": "glycemia_update",
  "data": {
    "reading_id": "eda8966a-061f-4ed5-a036-04120b0e8a13",
    "value": 120,
    "unit": "mg/dL",
    "measured_at": "2026-01-30T15:20:33.217332+00:00",
    "recorded_at": "2026-01-30T15:20:33.217702+00:00",
    "trend": null,
    "rate": null,
    "source": "manual",
    "context": "fasting"
  }
}
```

### 3. `glycemia_alert`
Reçu quand la glycémie est anormale.

```json
{
  "type": "glycemia_alert",
  "alert_type": "hypoglycemia",
  "data": {
    "reading_id": "...",
    "value": 55,
    "unit": "mg/dL",
    ...
  }
}
```

| alert_type | Condition |
|------------|-----------|
| `hypoglycemia` | valeur < 70 mg/dL |
| `hyperglycemia` | valeur > 180 mg/dL |

### 4. `pong`
Réponse à un ping.

```json
{
  "type": "pong"
}
```

---

## Messages à envoyer

### Ping (optionnel)
Pour vérifier que la connexion est toujours active :

```javascript
ws.send(JSON.stringify({ type: 'ping' }));
// Réponse: { "type": "pong" }
```

---

## Exemple complet d'utilisation

```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useGlycemiaWebSocket from './hooks/useGlycemiaWebSocket';

const GlycemiaLiveDisplay = ({ accessToken }) => {
  const { isConnected, lastReading, alert } = useGlycemiaWebSocket(accessToken);

  return (
    <View style={styles.container}>
      {/* Status connexion */}
      <View style={[styles.status, isConnected ? styles.online : styles.offline]}>
        <Text>{isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}</Text>
      </View>

      {/* Dernière mesure */}
      {lastReading && (
        <View style={styles.reading}>
          <Text style={styles.value}>{lastReading.value}</Text>
          <Text style={styles.unit}>{lastReading.unit}</Text>
        </View>
      )}

      {/* Alerte */}
      {alert && (
        <View style={[
          styles.alert,
          alert.type === 'hypoglycemia' ? styles.alertHypo : styles.alertHyper
        ]}>
          <Text style={styles.alertText}>
            {alert.type === 'hypoglycemia'
              ? '⚠️ Hypoglycémie!'
              : '⚠️ Hyperglycémie!'}
          </Text>
          <Text>{alert.data.value} {alert.data.unit}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  status: { padding: 10, borderRadius: 5, marginBottom: 10 },
  online: { backgroundColor: '#d4edda' },
  offline: { backgroundColor: '#f8d7da' },
  reading: { alignItems: 'center', marginVertical: 20 },
  value: { fontSize: 48, fontWeight: 'bold' },
  unit: { fontSize: 18, color: '#666' },
  alert: { padding: 15, borderRadius: 10, marginTop: 10 },
  alertHypo: { backgroundColor: '#fff3cd' },
  alertHyper: { backgroundColor: '#f8d7da' },
  alertText: { fontSize: 18, fontWeight: 'bold' },
});

export default GlycemiaLiveDisplay;
```

---

## Gestion de la reconnexion

```javascript
const useGlycemiaWebSocket = (accessToken) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = () => {
    if (!accessToken) return;

    ws.current = new WebSocket(
      `ws://localhost:8006/ws/glycemia/?token=${accessToken}`
    );

    ws.current.onopen = () => setIsConnected(true);

    ws.current.onclose = () => {
      setIsConnected(false);
      // Reconnexion automatique après 3 secondes
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onmessage = (event) => {
      // ... traitement des messages
    };
  };

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, [accessToken]);

  return { isConnected };
};
```

---

## Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| Code 4001 | Token invalide ou expiré | Rafraîchir le token JWT |
| Code 403 | Origin non autorisé | Vérifier l'URL de connexion |
| Connexion fermée | Serveur redémarré | Implémenter la reconnexion auto |

---

## Résumé

1. **Connexion** : `ws://localhost:8006/ws/glycemia/?token=<JWT>`
2. **Écouter** : `glycemia_update` et `glycemia_alert`
3. **Alertes** : `hypoglycemia` (<70) et `hyperglycemia` (>180)
4. **Ping/Pong** : Optionnel, pour vérifier la connexion
