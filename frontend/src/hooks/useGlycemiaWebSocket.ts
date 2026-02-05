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
 * Backend: ws://localhost:8006/ws/glycemia/?token=<JWT_ACCESS_TOKEN>
 */
export function useGlycemiaWebSocket(
  accessToken: string | null,
  wsUrl: string = 'ws://localhost:8006'
): UseGlycemiaWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
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
      console.warn('useGlycemiaWebSocket: No access token provided');
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
        console.log('✅ WebSocket glycemia connected');
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
              console.log('WebSocket connection confirmed:', data.user_id);
              break;

            case 'glycemia_update':
              // Nouvelle mesure reçue
              console.log('📊 New glycemia reading:', data.data);
              setLastReading(data.data);
              break;

            case 'glycemia_alert':
              // Alerte hypo ou hyper
              console.warn('⚠️ Glycemia alert:', data.alert_type);
              setAlert({
                type: data.alert_type,
                data: data.data,
              });
              break;

            case 'pong':
              // Réponse au ping
              break;

            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = event => {
        console.log(`WebSocket disconnected: code ${event.code}`);
        setIsConnected(false);

        // Don't reconnect on authentication failure (code 4001)
        // or normal closure (code 1000)
        if (event.code === 4001) {
          console.error(
            '❌ WebSocket authentication failed. Check your access token.'
          );
          return;
        }

        if (event.code === 1000) {
          console.log('WebSocket closed normally');
          return;
        }

        // Reconnexion automatique après 3 secondes pour autres erreurs
        if (accessToken) {
          reconnectTimeout.current = setTimeout(() => {
            console.log('🔄 Attempting WebSocket reconnection...');
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = error => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
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
