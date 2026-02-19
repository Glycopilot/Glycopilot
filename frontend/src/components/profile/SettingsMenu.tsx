import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import type { LucideIcon } from 'lucide-react-native';

export interface SettingMenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  value?: string;
  route?: string;
  action?: () => void;
}

interface SettingsMenuProps {
  readonly items: SettingMenuItem[];
}

export default function SettingsMenu({
  items,
}: SettingsMenuProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Paramètres</Text>
      <View style={styles.settingsList}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.settingItem}
              onPress={() => {
                if (item.action) {
                  item.action();
                } else {
                  console.log(item.route);
                }
              }}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Icon size={20} color="#007AFF" strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.value && (
                    <Text style={styles.settingValue}>{item.value}</Text>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  settingsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
