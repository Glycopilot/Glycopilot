import {
  View,
  Text,
  StyleSheet,
  Button,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Activity,
  Pill,
  LayoutDashboard,
  Zap,
  Lightbulb,
} from 'lucide-react-native';
import authService from '../services/authService';
import { useDashboard } from '../hooks/useDashboard';
import Layout from '../components/common/Layout';
import GlycemieCard from '../components/dashboard/GlycemieCard';
import StatCard from '../components/dashboard/StatCard';
import GlycemieChart from '../components/dashboard/GlycemieChart';
import NotificationCard from '../components/common/NotificationCard';
import ActionButton from '../components/common/ActionButton';
import Banner from '../components/dashboard/Banner';

export default function HomeScreen({ navigation }) {
  // Utiliser le hook dashboard sans auto-refresh (pull-to-refresh manuel uniquement)
  const {
    glucose,
    alerts,
    medication,
    nutrition,
    activity,
    healthScore,
    loading,
    refreshing,
    error,
    refresh,
  } = useDashboard({
    modules: ['glucose', 'alerts', 'medication', 'nutrition', 'activity'],
    refreshInterval: null, // Pas de refresh automatique - les composants animent déjà les changements
    autoLoad: true,
  });

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

  // Déterminer le statut de la glycémie
  const getGlycemieStatus = value => {
    if (!value) return 'normal';
    if (value < 70) return 'low';
    if (value > 180) return 'high';
    if (value >= 140) return 'warning';
    return 'normal';
  };

  // Afficher un loader pendant le chargement initial
  if (loading && !glucose) {
    return (
      <Layout
        navigation={navigation}
        currentRoute="Home"
        userName="Utilisateur"
        onNotificationPress={() => console.log('Notifications')}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement du dashboard...</Text>
        </View>
      </Layout>
    );
  }

  // Afficher une erreur si le chargement échoue
  if (error && !glucose) {
    return (
      <Layout
        navigation={navigation}
        currentRoute="Home"
        userName="Utilisateur"
        onNotificationPress={() => console.log('Notifications')}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Réessayer" onPress={refresh} />
        </View>
      </Layout>
    );
  }

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <Banner userName="Utilisateur" />

        {/* 1. Stats - Glycémie Card */}
        <View style={styles.sectionHeader}>
          <LayoutDashboard size={20} color="#8E8E93" />
          <Text style={styles.sectionTitle}>Stats</Text>
        </View>

        {glucose && glucose.value != null && (
          <GlycemieCard
            value={Number(glucose.value)}
            status={getGlycemieStatus(glucose.value)}
            timestamp={glucose.recordedAt}
            onPress={() => console.log('Glycémie details')}
          />
        )}

        {/* Row avec les StatCards */}
        <View style={styles.statsRow}>
          {activity && (
            <StatCard
              title="Activité"
              icon={Activity}
              iconColor="#007AFF"
              iconBgColor="#E5F2FF"
              value={Number(activity?.steps?.value) || 0}
              subtitle="pas aujourd'hui"
              onPress={() => console.log('Activity details')}
            />
          )}

          {medication &&
            (() => {
              // Debug: voir les données medication
              console.log('Medication data:', medication);
              const medValue = 2; // Nombre fixe pour test
              const medSecondary = 5; // Nombre fixe pour test
              console.log('StatCard values:', { medValue, medSecondary });

              return (
                <StatCard
                  title="Médics"
                  icon={Pill}
                  iconColor="#AF52DE"
                  iconBgColor="#F5EBFF"
                  value={medValue}
                  secondaryValue={medSecondary}
                  subtitle="prise aujourd'hui"
                  onPress={() => console.log('Medications details')}
                />
              );
            })()}
        </View>

        {/* Chart */}
        <View>
          <GlycemieChart currentValue={glucose?.value} />
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

        {/* Afficher les alertes actives */}
        {/* {alerts && alerts.length > 0 && alerts[0].type && (
          <NotificationCard
            type="alert"
            title="Alerte"
            message={String(alerts[0].type)}
            onPress={() => console.log('Alert pressed', alerts[0])}
          />
        )} */}

        {/* Afficher le prochain médicament */}
        {medication?.nextDose?.name && medication?.nextDose?.scheduledAt && (
          <NotificationCard
            type="medicament"
            title="Médicaments"
            message="Prochaine dose"
            time={{
              label: String(medication.nextDose.name),
              value: new Date(
                medication.nextDose.scheduledAt
              ).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            }}
            onPress={() => console.log('Medication notification')}
            onDismiss={() => console.log('Dismissed')}
          />
        )}

        {/* Message par défaut si pas d'alertes ni de médicaments */}
        {(!alerts || alerts.length === 0) && !medication?.nextDose && (
          <NotificationCard
            type="recommandation"
            message="Tout va bien ! Continuez comme ça "
            onPress={() => console.log('Notification pressed')}
          />
        )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
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
  medicCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  medicIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5EBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  medicName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  medicTime: {
    fontSize: 13,
    color: '#AF52DE',
    fontWeight: '500',
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
