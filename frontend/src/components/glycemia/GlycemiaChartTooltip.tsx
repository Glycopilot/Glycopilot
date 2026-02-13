import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import { getGlycemiaStatusColor } from '../../constants/glycemia.constants';

export interface TooltipData {
  value: number;
  label: string;
  context?: string;
  time?: string;
  date?: string;
}

interface GlycemiaChartTooltipProps {
  visible: boolean;
  data: TooltipData | null;
  onClose: () => void;
}

export default function GlycemiaChartTooltip({
  visible,
  data,
  onClose,
}: GlycemiaChartTooltipProps): React.JSX.Element {
  if (!data) return <></>;

  const { color, bgColor } = getGlycemiaStatusColor(data.value);

  const getStatusLabel = (value: number): string => {
    if (value < 70) return 'Hypoglycémie';
    if (value > 180) return 'Hyperglycémie';
    return 'Normal';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.tooltip}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View>
                    <Text style={styles.headerTitle}>Mesure de glycémie</Text>
                    {data.date && (
                      <Text style={styles.headerSubtitle}>{data.date}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Valeur principale */}
              <View
                style={[styles.valueContainer, { backgroundColor: bgColor }]}
              >
                <View style={styles.valueMain}>
                  <Text style={[styles.value, { color: color }]}>
                    {data.value}
                  </Text>
                  <Text style={[styles.unit, { color: color }]}>mg/dL</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color }]}>
                  <Text style={styles.statusText}>
                    {getStatusLabel(data.value)}
                  </Text>
                </View>
              </View>

              {/* Détails */}
              <View style={styles.details}>
                {data.time && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Heure</Text>
                    <Text style={styles.detailValue}>{data.time}</Text>
                  </View>
                )}

                {data.context && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contexte</Text>
                    <Text style={styles.detailValue}>{data.context}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plage cible</Text>
                  <Text style={styles.detailValue}>70 - 180 mg/dL</Text>
                </View>
              </View>

              {/* Footer */}
              <TouchableOpacity
                style={styles.closeButtonBottom}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueContainer: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  valueMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  value: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  details: {
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButtonBottom: {
    margin: 20,
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
