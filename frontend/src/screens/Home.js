import {
  View,
  Text,
  StyleSheet,
  Button,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Activity,
  Pill,
  LayoutDashboard,
  Zap,
  Lightbulb,
} from 'lucide-react-native';
import authService from '../services/authService';
import Layout from '../components/common/Layout';
import GlycemieCard from '../components/dashboard/GlycemieCard';
import StatCard from '../components/dashboard/StatCard';
import GlycemieChart from '../components/dashboard/GlycemieChart';
import NotificationCard from '../components/common/NotificationCard';
import ActionButton from '../components/common/ActionButton';
import Banner from '../components/dashboard/Banner';

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    try {
      await authService.logout();
      // Reset navigation to Login
      if (navigation && navigation.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
      console.warn('Logout error', err);
    }
  };

  return (
    <Layout
      navigation={navigation}
      currentRoute="Home"
      userName="Utilisateur"
      onNotificationPress={() => console.log('Notifications')}
    >
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Banner userName="Utilisateur" />

        {/* 1. Stats - Glycémie Card */}
        <View style={styles.sectionHeader}>
          <LayoutDashboard size={20} color="#8E8E93" />
          <Text style={styles.sectionTitle}>Stats</Text>
        </View>
        <GlycemieCard
          value={95}
          status="normal"
          onPress={() => console.log('Glycémie details')}
        />

        {/* Row avec les deux StatCards */}
        <View style={styles.statsRow}>
          <StatCard
            title="Activité"
            icon={Activity}
            iconColor="#007AFF"
            iconBgColor="#E5F2FF"
            value={4220}
            subtitle="pas aujourd'hui"
            onPress={() => console.log('Activity details')}
          />

          <StatCard
            title="Médics"
            icon={Pill}
            iconColor="#AF52DE"
            iconBgColor="#F5EBFF"
            value={2}
            secondaryValue={5}
            subtitle="prise aujourd'hui"
            onPress={() => console.log('Medications details')}
          />
        </View>
        {/* Chart */}
        <View>
          <GlycemieChart />
        </View>
        {/* 2. Actions Rapides */}
        <View style={styles.sectionHeader}>
          <Zap size={20} color="#8E8E93" />
          <Text style={styles.sectionTitle}>Action Rapide</Text>
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            type="glycemie"
            onPress={() => console.log('Glycémie action')}
          />
          <ActionButton
            type="repas"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Repas');
              }
            }}
          />
          <ActionButton
            type="medic"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Traitements');
              }
            }}
          />
          <ActionButton
            type="activite"
            onPress={() => {
              if (navigation && navigation.navigate) {
                navigation.navigate('Activite');
              }
            }}
          />
        </View>

        {/* 3. Notifications */}
        <View style={styles.sectionHeader}>
          <Lightbulb size={20} color="#8E8E93" />
          <Text style={styles.sectionTitle}>Recommandation</Text>
        </View>
        <NotificationCard
          type="recommandation"
          message="N'oubliez pas de prendre votre médicament"
          onPress={() => console.log('Notification pressed')}
        />

        <NotificationCard
          type="medicament"
          title="Medicaments"
          message="Prochaine dose"
          time={{ label: 'Metformine', value: '14:39' }}
          onPress={() => console.log('Medication notification')}
          onDismiss={() => console.log('Dismissed')}
        />

        {/* Espace pour la navbar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 4,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  bottomPadding: {
    height: 100,
  },
});
