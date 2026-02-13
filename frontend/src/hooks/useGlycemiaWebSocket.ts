import { useEffect, useRef, useState, useCallback } from 'react';
import type { GlycemiaEntry } from '../types/glycemia.types';

interface GlycemiaAlert {
  type: 'hypoglycemia' | 'hyperglycemia';
  data: GlycemiaEntry;
}

interface UseGlycemiaWebSocketReturn {
  isConnected: boolean;
  lastReading: GlycemiaEntry | null;
  alert: GlycemiaAlert | null;
  sendPing: () => void;
  clearAlert: () => void;
}

/**
 * Hook pour gérer la connexion WebSocket temps réel de la glycémie
 * Backend: {EXPO_PUBLIC_WS_URL}/ws/glycemia/?token=<JWT_ACCESS_TOKEN>
 */
export function useGlycemiaWebSocket(
  accessToken: string | null,
  wsUrl: string
): UseGlycemiaWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastReading, setLastReading] = useState<GlycemiaEntry | null>(null);
  const [alert, setAlert] = useState<GlycemiaAlert | null>(null);

  /**
   * Envoie un ping pour vérifier la connexion
   */
  const sendPing = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  /**
   * Efface l'alerte actuelle
   */
  const clearAlert = useCallback(() => {
    setAlert(null);
  }, []);

  /**
   * Établit la connexion WebSocket
   */
  const connect = useCallback(() => {
    if (!accessToken) {
      return;
    }

    // Fermer l'ancienne connexion si elle existe
    if (ws.current) {
      ws.current.close();
    }

    try {
      // Créer la connexion WebSocket avec le token
      const wsFullUrl = `${wsUrl}/ws/glycemia/?token=${accessToken}`;
      ws.current = new WebSocket(wsFullUrl);

      ws.current.onopen = () => {
        setIsConnected(true);

        // Nettoyer le timeout de reconnexion
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      ws.current.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'connection_established':
              break;

            case 'glycemia_update':
              setLastReading(data.data);
              break;

            case 'glycemia_alert':
              setAlert({
                type: data.alert_type,
                data: data.data,
              });
              break;

            case 'pong':
              // Réponse au ping
              break;

            default:
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.current.onclose = event => {
        setIsConnected(false);

        // Don't reconnect on authentication failure (code 4001)
        // or normal closure (code 1000)
        if (event.code === 4001 || event.code === 1000) {
          return;
        }

        // Reconnexion automatique après 3 secondes pour autres erreurs
        if (accessToken) {
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      // Connection failed silently
    }
  }, [accessToken, wsUrl]);

  // Établir la connexion au montage
  useEffect(() => {
    if (accessToken) {
      connect();
    }

    // Cleanup à la déconnexion
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect, accessToken]);

  return {
    isConnected,
    lastReading,
    alert,
    sendPing,
    clearAlert,
  };
}

export default useGlycemiaWebSocket;
