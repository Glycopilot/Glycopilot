import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, BellOff, CheckCircle, Plus } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import alertService from '../services/alertService';
import { getGlycemiaStatusColor } from '../constants/glycemia.constants';
import { toastSuccess, toastError } from '../services/toastService';
import type { AlertEvent } from '../types/alert.types';

interface NotificationsScreenProps {
  navigation: any;
}

type AlertFilter = 'all' | 'hypo' | 'hyper';

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Il y a ${diffD}j`;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'TRIGGERED': return 'Déclenchée';
    case 'SENT': return 'Envoyée';
    case 'ACKED': return 'Acquittée';
    case 'RESOLVED': return 'Résolue';
    case 'FAILED': return 'Échouée';
    default: return status;
  }
}

function getStatusBadgeStyle(status: string): { bg: string; text: string } {
  switch (status) {
    case 'TRIGGERED': return { bg: '#FEE2E2', text: '#DC2626' };
    case 'SENT': return { bg: '#FEF3C7', text: '#F59E0B' };
    case 'ACKED': return { bg: '#D1FAE5', text: '#10B981' };
    case 'RESOLVED': return { bg: '#DBEAFE', text: '#3B82F6' };
    case 'FAILED': return { bg: '#F3F4F6', text: '#6B7280' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
  }
}

const isHypo = (ruleName: string) =>
  ruleName.toLowerCase().includes('hypo') && !ruleName.toLowerCase().includes('hyper');

export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchAlerts = useCallback(async () => {
    const data = await alertService.getHistory();
    setAlerts(data);
  }, []);

  useEffect(() => {
    fetchAlerts().finally(() => setLoading(false));
  }, [fetchAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }, [fetchAlerts]);

  const handleAck = useCallback(async (eventId: number) => {
    const success = await alertService.ackAlert(eventId);
    if (success) {
      setAlerts(prev =>
        prev.map(a => (a.id === eventId ? { ...a, status: 'ACKED' } : a))
      );
      toastSuccess('Alerte acquittée');
    } else {
      toastError('Erreur', "Impossible d'acquitter l'alerte");
    }
  }, []);

  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return alerts;
    if (alertFilter === 'hypo') return alerts.filter(a => isHypo(a.rule_name));
    return alerts.filter(a => !isHypo(a.rule_name));
  }, [alerts, alertFilter]);

  const displayedAlerts = filteredAlerts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAlerts.length;
  const remaining = filteredAlerts.length - visibleCount;

  const loadMore = () => setVisibleCount(prev => prev + 10);

  const unackedCount = alerts.filter(a => a.status !== 'ACKED' && a.status !== 'RESOLVED').length;

  if (loading) {
    return (
      <Layout navigation={navigation} currentRoute="Notifications">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF9F1C" />
        </View>
      </Layout>
    );
  }

  return (
    <Layout navigation={navigation} currentRoute="Notifications">
      <View style={styles.header}>
        <Text style={styles.title}>Alertes</Text>
        {unackedCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unackedCount}</Text>
          </View>
        )}
      </View>

      {/* Filtres */}
      <View style={styles.filterContainer}>
        {(['all', 'hypo', 'hyper'] as AlertFilter[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              alertFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => {
              setAlertFilter(filter);
              setVisibleCount(10);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                alertFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter === 'all'
                ? 'Toutes'
                : filter === 'hypo'
                  ? 'Hypo'
                  : 'Hyper'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF9F1C"
          />
        }
      >
        {displayedAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <BellOff size={48} color="#C7C7CC" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Aucune alerte</Text>
            <Text style={styles.emptySubtitle}>
              {alertFilter === 'all'
                ? 'Les alertes de glycémie apparaîtront ici'
                : `Aucune alerte ${alertFilter === 'hypo' ? "d'hypoglycémie" : "d'hyperglycémie"}`}
            </Text>
          </View>
        ) : (
          <>
            {displayedAlerts.map(alert => {
              const hypo = isHypo(alert.rule_name);
              const alertColors = getGlycemiaStatusColor(hypo ? 50 : 200);
              const statusBadge = getStatusBadgeStyle(alert.status);
              const canAck = alert.status !== 'ACKED' && alert.status !== 'RESOLVED';

              return (
                <View key={alert.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.iconContainer, { backgroundColor: alertColors.bgColor }]}>
                      <AlertTriangle size={20} color={alertColors.color} strokeWidth={2.5} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.ruleName}>{alert.rule_name}</Text>
                      <Text style={styles.glycemiaValue}>
                        Glycémie: {alert.glycemia_value} mg/dL
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.timeText}>
                          {getRelativeTime(alert.triggered_at)}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                          <Text style={[styles.statusText, { color: statusBadge.text }]}>
                            {getStatusLabel(alert.status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {canAck && (
                      <TouchableOpacity
                        style={styles.ackButton}
                        onPress={() => handleAck(alert.id)}
                      >
                        <CheckCircle size={22} color="#10B981" strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                activeOpacity={0.75}
              >
                <Text style={styles.loadMoreText}>
                  Voir {Math.min(10, remaining)} de plus ({remaining} restantes)
                </Text>
                <View style={styles.loadMoreIcon}>
                  <Plus size={20} color="#FF9F1C" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  badge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  filterButtonActive: {
    backgroundColor: '#FF9F1C',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#AEAEB2',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  ruleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  glycemiaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ackButton: {
    padding: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9F1C',
  },
  loadMoreIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});
