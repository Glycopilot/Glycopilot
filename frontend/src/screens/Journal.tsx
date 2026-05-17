import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Utensils, Pill, Activity, ChevronRight } from 'lucide-react-native';
import Layout from '../components/common/Layout';
import { colors } from '../themes/colors';

interface JournalScreenProps {
  navigation: any;
}

const SECTIONS = [
  {
    key: 'Repas',
    label: 'Repas',
    description: 'Suivez vos repas et apports nutritionnels du jour',
    Icon: Utensils,
    color: '#10B981',
    bg: '#D1FAE5',
    route: 'Repas',
  },
  {
    key: 'Traitements',
    label: 'Médicaments',
    description: 'Vos prises du jour, rappels et historique de traitement',
    Icon: Pill,
    color: '#8B5CF6',
    bg: '#EDE9FE',
    route: 'Traitements',
  },
  {
    key: 'Activite',
    label: 'Activité physique',
    description: 'Enregistrez vos séances et suivez votre impact glycémique',
    Icon: Activity,
    color: '#F59E0B',
    bg: '#FEF3C7',
    route: 'Activite',
  },
];

export default function JournalScreen({ navigation }: JournalScreenProps) {
  return (
    <Layout navigation={navigation} currentRoute="Journal">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Mon journal</Text>
        <Text style={styles.sub}>Repas, médicaments et activité au quotidien</Text>

        {SECTIONS.map(({ key, label, description, Icon, color, bg, route }) => (
          <TouchableOpacity
            key={key}
            style={styles.card}
            onPress={() => navigation.navigate(route)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: bg }]}>
              <Icon size={28} color={color} strokeWidth={2} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{label}</Text>
              <Text style={styles.cardDesc}>{description}</Text>
            </View>
            <ChevronRight size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
