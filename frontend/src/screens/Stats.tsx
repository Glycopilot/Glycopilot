import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Filter,
  CheckCircle,
  Circle,
} from 'lucide-react-native';
import Layout from '../components/common/Layout';
import GlycemiaChart from '../components/glycemia/GlycemiaChart';
import { colors } from '../themes/colors';
import {
  GLYCEMIA_TARGET,
  getGlycemiaStatusColor,
} from '../constants/glycemia.constants';
import { useGlycemia } from '../hooks/useGlycemia';

const { width } = Dimensions.get('window');

// Types
type PeriodFilter = 'Jour' | 'Semaine' | 'Mois';
type SourceFilter = 'all' | 'manual' | 'cgm';

interface GlucoseMeasurement {
  id: string;
  value: number;
  time: string;
  context: string;
  source: 'manual' | 'cgm';
  date: string;
}

interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  timeInRange: number;
  stability: 'Bon' | 'Moyen' | 'Faible';
  variability: number;
}

interface GlucoseTrackingScreenProps {
  navigation: {
    navigate: (screen: string) => void;
    reset?: (config: {
      index: number;
      routes: Array<{ name: string }>;
    }) => void;
  };
}

// export default function GlucoseTrackingScreen({
//   navigation,
// }: GlucoseTrackingScreenProps): React.JSX.Element {
//   const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('Semaine');
//   const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

//   // Déterminer le nombre de jours selon la période
//   const days =
//     selectedPeriod === 'Jour' ? 1 : selectedPeriod === 'Semaine' ? 7 : 30;

//   // Hook pour charger les données depuis le backend
//   const {
//     measurements: backendData,
//     loading,
//     refreshing,
//     refresh,
//     loadHistory,
//   } = useGlycemia(days);

//   // Recharger quand la période change
//   useEffect(() => {
//     loadHistory(days);
//   }, [selectedPeriod]);

//   // Transformer les données backend en format UI
//   const allMeasurements: GlucoseMeasurement[] = useMemo(() => {
//     return backendData.map((entry, index) => {
//       const date = new Date(entry.measured_at);
//       const now = new Date();
//       const isToday = date.toDateString() === now.toDateString();
//       const yesterday = new Date(now);
//       yesterday.setDate(yesterday.getDate() - 1);
//       const isYesterday = date.toDateString() === yesterday.toDateString();

//       // Contexte mapping
//       const contextMap: Record<string, string> = {
//         fasting: 'À jeun',
//         preprandial: 'Avant repas',
//         postprandial_1h: 'Après repas (1h)',
//         postprandial_2h: 'Après repas (2h)',
//         bedtime: 'Coucher',
//         exercise: 'Exercice',
//         stress: 'Stress',
//         correction: 'Correction',
//       };

//       return {
//         id:
//           entry.reading_id ||
//           `${entry.id}-${entry.measured_at}` ||
//           `measurement-${index}`,
//         value: entry.value,
//         time: date.toLocaleTimeString('fr-FR', {
//           hour: '2-digit',
//           minute: '2-digit',
//         }),
//         context: contextMap[entry.context || ''] || 'Autre',
//         source: (entry.source || 'manual') as 'manual' | 'cgm',
//         date: isToday
//           ? "Aujourd'hui"
//           : isYesterday
//             ? 'Hier'
//             : date.toLocaleDateString('fr-FR'),
//       };
//     });
//   }, [backendData]);

//   // Filtrer par source
//   const measurements = useMemo(() => {
//     return allMeasurements.filter(m => {
//       if (sourceFilter === 'all') return true;
//       return m.source === sourceFilter;
//     });
//   }, [allMeasurements, sourceFilter]);

//   // Calculer les statistiques réelles
//   const stats: GlucoseStats = useMemo(() => {
//     if (measurements.length === 0) {
//       return {
//         average: 0,
//         min: 0,
//         max: 0,
//         timeInRange: 0,
//         stability: 'Faible',
//         variability: 0,
//       };
//     }

//     const values = measurements.map(m => m.value);
//     const average = Math.round(
//       values.reduce((a, b) => a + b, 0) / values.length
//     );
//     const min = Math.min(...values);
//     const max = Math.max(...values);

//     // Calculer le temps dans la cible (70-180 mg/dL)
//     const inRange = values.filter(
//       v => v >= GLYCEMIA_TARGET.MIN && v <= GLYCEMIA_TARGET.MAX
//     ).length;
//     const timeInRange = Math.round((inRange / values.length) * 100);

//     // Calculer la variabilité (écart-type)
//     const variance =
//       values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) /
//       values.length;
//     const variability = Math.round(Math.sqrt(variance));

//     // Déterminer la stabilité
//     let stability: 'Bon' | 'Moyen' | 'Faible' = 'Bon';
//     if (variability > 40) stability = 'Faible';
//     else if (variability > 25) stability = 'Moyen';

//     return {
//       average,
//       min,
//       max,
//       timeInRange,
//       stability,
//       variability,
//     };
//   }, [measurements]);

//   // Générer les données du graphique à partir des vraies mesures
//   const chartData = useMemo(() => {
//     if (measurements.length === 0) {
//       return {
//         labels: ['00:00', '06:00', '12:00', '18:00'],
//         datasets: [{ data: [100, 100, 100, 100] }],
//       };
//     }

//     // Grouper par intervalles de temps selon la période
//     const sortedMeasurements = [...measurements].sort(
//       (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
//     );

//     let labels: string[];
//     let dataPoints: number[];

//     if (selectedPeriod === 'Jour') {
//       // Par tranches de 4h pour la journée
//       labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
//       dataPoints = new Array(6).fill(0);
//       const counts = new Array(6).fill(0);

//       measurements.forEach(m => {
//         const hour = parseInt(m.time.split(':')[0]);
//         const index = Math.floor(hour / 4);
//         if (index < 6) {
//           dataPoints[index] += m.value;
//           counts[index]++;
//         }
//       });

//       dataPoints = dataPoints.map((sum, i) =>
//         counts[i] > 0 ? Math.round(sum / counts[i]) : 100
//       );
//     } else if (selectedPeriod === 'Semaine') {
//       // Par jour de la semaine
//       labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
//       dataPoints = new Array(7).fill(0);
//       const counts = new Array(7).fill(0);

//       measurements.forEach(m => {
//         const date = new Date();
//         const dayOfWeek = date.getDay();
//         const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
//         dataPoints[index] += m.value;
//         counts[index]++;
//       });

//       dataPoints = dataPoints.map((sum, i) =>
//         counts[i] > 0 ? Math.round(sum / counts[i]) : 100
//       );
//     } else {
//       // Par semaine du mois
//       labels = ['S1', 'S2', 'S3', 'S4'];
//       dataPoints = new Array(4).fill(0);
//       const counts = new Array(4).fill(0);

//       measurements.forEach(m => {
//         const weekIndex = Math.min(
//           3,
//           Math.floor(measurements.indexOf(m) / (measurements.length / 4))
//         );
//         dataPoints[weekIndex] += m.value;
//         counts[weekIndex]++;
//       });

//       dataPoints = dataPoints.map((sum, i) =>
//         counts[i] > 0 ? Math.round(sum / counts[i]) : 100
//       );
//     }

//     return {
//       labels,
//       datasets: [{ data: dataPoints }],
//     };
//   }, [measurements, selectedPeriod]);

//   const getGlucoseColor = (value: number): string => {
//     const { color } = getGlycemiaStatusColor(value);
//     return color;
//   };

//   const getGlucoseStatus = (
//     value: number
//   ): { label: string; color: string } => {
//     if (value < GLYCEMIA_TARGET.MIN)
//       return { label: 'Bas', color: getGlycemiaStatusColor(value).color };
//     if (value > GLYCEMIA_TARGET.MAX)
//       return { label: 'Haut', color: getGlycemiaStatusColor(value).color };
//     return { label: 'Normal', color: getGlycemiaStatusColor(value).color };
//   };

//   const filteredMeasurements = measurements.filter(m => {
//     if (sourceFilter === 'all') return true;
//     return m.source === sourceFilter;
//   });

//   const exportToCSV = async (): Promise<void> => {
//     // Créer le contenu CSV
//     const csvHeader = 'Date,Heure,Valeur (mg/dL),Contexte,Source\n';
//     const csvRows = measurements
//       .map(
//         m =>
//           `${m.date},${m.time},${m.value},${m.context},${m.source === 'manual' ? 'Manuel' : 'CGM'}`
//       )
//       .join('\n');
//     const csvContent = csvHeader + csvRows;

//     try {
//       await Share.share({
//         message: csvContent,
//         title: 'Export Glycémie',
//       });
//     } catch (error) {
//       console.error('Error sharing:', error);
//     }
//   };

//   return (
//     <Layout
//       navigation={navigation}
//       currentRoute="Home"
//       userName="Utilisateur"
//       onNotificationPress={() => console.log('Notifications')}
//     >
//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#007AFF" />
//           <Text style={styles.loadingText}>Chargement des données...</Text>
//         </View>
//       ) : (
//         <ScrollView
//           style={styles.container}
//           showsVerticalScrollIndicator={false}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={refresh}
//               tintColor="#007AFF"
//             />
//           }
//         >
//           {/* Header */}
//           <View style={styles.header}>
//             <View>
//               <Text style={styles.title}>Suivi Glucose</Text>
//               <Text style={styles.subtitle}>Historique et tendances</Text>
//             </View>
//             <TouchableOpacity style={styles.calendarButton}>
//               <Calendar size={20} color="#007AFF" />
//             </TouchableOpacity>
//           </View>

//           {/* Filtres de période */}
//           <View style={styles.periodFilters}>
//             {(['Jour', 'Semaine', 'Mois'] as PeriodFilter[]).map(period => (
//               <TouchableOpacity
//                 key={period}
//                 onPress={() => setSelectedPeriod(period)}
//                 style={[
//                   styles.periodButton,
//                   selectedPeriod === period && styles.periodButtonActive,
//                 ]}
//               >
//                 <Text
//                   style={[
//                     styles.periodText,
//                     selectedPeriod === period && styles.periodTextActive,
//                   ]}
//                 >
//                   {period}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>

//           {/* Graphique */}
//           <GlycemiaChart chartData={chartData} />

//           {/* Cartes statistiques */}
//           <View style={styles.statsGrid}>
//             <View style={styles.statCard}>
//               <Text style={styles.statLabel}>Moyenne</Text>
//               <Text style={styles.statValue}>{stats.average}</Text>
//               <Text style={styles.statUnit}>mg/dL</Text>
//             </View>

//             <View style={styles.statCard}>
//               <Text style={styles.statLabel}>Minimum</Text>
//               <Text style={[styles.statValue, { color: '#EF4444' }]}>
//                 {stats.min}
//               </Text>
//               <Text style={styles.statUnit}>mg/dL</Text>
//             </View>

//             <View style={styles.statCard}>
//               <Text style={styles.statLabel}>Maximum</Text>
//               <Text style={[styles.statValue, { color: '#F59E0B' }]}>
//                 {stats.max}
//               </Text>
//               <Text style={styles.statUnit}>mg/dL</Text>
//             </View>
//           </View>

//           <View style={styles.statsGrid}>
//             <View style={styles.statCard}>
//               <Text style={styles.statLabel}>Temps cible</Text>
//               <Text style={[styles.statValue, { color: '#10B981' }]}>
//                 {stats.timeInRange}%
//               </Text>
//               <Text style={styles.statUnit}>
//                 dans {GLYCEMIA_TARGET.MIN}-{GLYCEMIA_TARGET.MAX}
//               </Text>
//             </View>

//             <View style={styles.statCard}>
//               <Text style={styles.statLabel}>Stabilité</Text>
//               <Text
//                 style={[
//                   styles.statValue,
//                   {
//                     color:
//                       stats.stability === 'Bon'
//                         ? '#10B981'
//                         : stats.stability === 'Moyen'
//                           ? '#F59E0B'
//                           : '#EF4444',
//                   },
//                 ]}
//               >
//                 {stats.stability}
//               </Text>
//               <Text style={styles.statUnit}>écart-type</Text>
//             </View>

//             <View style={styles.statCard}>
//               <Text style={styles.statLabel}>Variabilité</Text>
//               <Text style={styles.statValue}>{stats.variability}</Text>
//               <Text style={styles.statUnit}>mg/dL</Text>
//             </View>
//           </View>

//           {/* Mesures récentes */}
//           <View style={styles.measurementsSection}>
//             <View style={styles.measurementsHeader}>
//               <Text style={styles.sectionTitle}>Mesures récentes</Text>
//               <View style={styles.headerActions}>
//                 <TouchableOpacity
//                   style={styles.exportButton}
//                   onPress={exportToCSV}
//                 >
//                   <Download size={16} color="#007AFF" />
//                   <Text style={styles.exportText}>Export CSV</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             {/* Filtres de source */}
//             <View style={styles.sourceFilters}>
//               <TouchableOpacity
//                 onPress={() => setSourceFilter('all')}
//                 style={[
//                   styles.sourceFilter,
//                   sourceFilter === 'all' && styles.sourceFilterActive,
//                 ]}
//               >
//                 <Text
//                   style={[
//                     styles.sourceFilterText,
//                     sourceFilter === 'all' && styles.sourceFilterTextActive,
//                   ]}
//                 >
//                   Toutes
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => setSourceFilter('manual')}
//                 style={[
//                   styles.sourceFilter,
//                   sourceFilter === 'manual' && styles.sourceFilterActive,
//                 ]}
//               >
//                 <Text
//                   style={[
//                     styles.sourceFilterText,
//                     sourceFilter === 'manual' && styles.sourceFilterTextActive,
//                   ]}
//                 >
//                   Manuel
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => setSourceFilter('cgm')}
//                 style={[
//                   styles.sourceFilter,
//                   sourceFilter === 'cgm' && styles.sourceFilterActive,
//                 ]}
//               >
//                 <Text
//                   style={[
//                     styles.sourceFilterText,
//                     sourceFilter === 'cgm' && styles.sourceFilterTextActive,
//                   ]}
//                 >
//                   CGM
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             {/* Liste des mesures */}
//             <View style={styles.measurementsList}>
//               {filteredMeasurements.map(measurement => {
//                 const status = getGlucoseStatus(measurement.value);
//                 return (
//                   <View key={measurement.id} style={styles.measurementCard}>
//                     <View style={styles.measurementLeft}>
//                       <View
//                         style={[
//                           styles.measurementValue,
//                           {
//                             backgroundColor: `${getGlucoseColor(measurement.value)}20`,
//                           },
//                         ]}
//                       >
//                         <Text
//                           style={[
//                             styles.measurementNumber,
//                             { color: getGlucoseColor(measurement.value) },
//                           ]}
//                         >
//                           {measurement.value}
//                         </Text>
//                         <Text
//                           style={[
//                             styles.measurementUnit,
//                             { color: getGlucoseColor(measurement.value) },
//                           ]}
//                         >
//                           mg/dL
//                         </Text>
//                       </View>
//                       <View style={styles.measurementInfo}>
//                         <Text style={styles.measurementTime}>
//                           {measurement.date}, {measurement.time}
//                         </Text>
//                         <View style={styles.measurementTags}>
//                           <View
//                             style={[
//                               styles.contextBadge,
//                               { backgroundColor: '#EBF5FF' },
//                             ]}
//                           >
//                             <Text style={styles.contextText}>
//                               🍽️ {measurement.context}
//                             </Text>
//                           </View>
//                           <View
//                             style={[
//                               styles.sourceBadge,
//                               {
//                                 backgroundColor:
//                                   measurement.source === 'manual'
//                                     ? '#F3E8FF'
//                                     : '#E0F2FE',
//                               },
//                             ]}
//                           >
//                             <Text
//                               style={[
//                                 styles.sourceText,
//                                 {
//                                   color:
//                                     measurement.source === 'manual'
//                                       ? '#7C3AED'
//                                       : '#0284C7',
//                                 },
//                               ]}
//                             >
//                               {measurement.source === 'manual'
//                                 ? '✏️ Manuel'
//                                 : '📊 CGM'}
//                             </Text>
//                           </View>
//                         </View>
//                       </View>
//                     </View>
//                     <View
//                       style={[
//                         styles.statusBadge,
//                         { backgroundColor: `${status.color}20` },
//                       ]}
//                     >
//                       <CheckCircle size={16} color={status.color} />
//                     </View>
//                   </View>
//                 );
//               })}
//             </View>

//             <TouchableOpacity style={styles.viewAllButton}>
//               <Text style={styles.viewAllText}>Tout voir</Text>
//             </TouchableOpacity>
//           </View>

//           {/* Comprendre vos statistiques */}
//           <View style={styles.infoSection}>
//             <Text style={styles.infoTitle}>💡 Comprendre vos statistiques</Text>
//             <View style={styles.infoCard}>
//               <View style={styles.infoItem}>
//                 <View style={styles.infoDot} />
//                 <Text style={styles.infoText}>
//                   <Text style={styles.infoBold}>Temps dans la cible :</Text>{' '}
//                   L'objectif est de rester au moins 70% du temps entre{' '}
//                   {GLYCEMIA_TARGET.MIN}-{GLYCEMIA_TARGET.MAX} mg/dL (Time In
//                   Range)
//                 </Text>
//               </View>
//               <View style={styles.infoItem}>
//                 <View style={styles.infoDot} />
//                 <Text style={styles.infoText}>
//                   <Text style={styles.infoBold}>Variabilité :</Text> Un
//                   écart-type ≤ 36 mg/dL indique une glycémie stable
//                 </Text>
//               </View>
//               <View style={styles.infoItem}>
//                 <View style={styles.infoDot} />
//                 <Text style={styles.infoText}>
//                   <Text style={styles.infoBold}>Stabilité :</Text> Compare la
//                   constance de vos niveaux sur la période sélectionnée
//                 </Text>
//               </View>
//             </View>
//           </View>

//           <View style={styles.bottomPadding} />
//         </ScrollView>
//       )}
//     </Layout>
//   );
// }
export default function GlucoseTrackingScreen({
  navigation,
}: GlucoseTrackingScreenProps): React.JSX.Element {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('Semaine');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Déterminer le nombre de jours selon la période
  const days =
    selectedPeriod === 'Jour' ? 1 : selectedPeriod === 'Semaine' ? 7 : 30;

  // Hook pour charger les données depuis le backend
  const {
    measurements: backendData,
    loading,
    refreshing,
    refresh,
    loadHistory,
  } = useGlycemia(days);

  // Recharger quand la période change
  useEffect(() => {
    loadHistory(days);
  }, [selectedPeriod]);

  // Transformer les données backend en format UI
  const allMeasurements: GlucoseMeasurement[] = useMemo(() => {
    return backendData.map((entry, index) => {
      const date = new Date(entry.measured_at);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      // Contexte mapping
      const contextMap: Record<string, string> = {
        fasting: 'À jeun',
        preprandial: 'Avant repas',
        postprandial_1h: 'Après repas (1h)',
        postprandial_2h: 'Après repas (2h)',
        bedtime: 'Coucher',
        exercise: 'Exercice',
        stress: 'Stress',
        correction: 'Correction',
      };

      return {
        id:
          entry.reading_id ||
          `${entry.id}-${entry.measured_at}` ||
          `measurement-${index}`,
        value: entry.value,
        time: date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        context: contextMap[entry.context || ''] || 'Autre',
        source: (entry.source || 'manual') as 'manual' | 'cgm',
        date: isToday
          ? "Aujourd'hui"
          : isYesterday
            ? 'Hier'
            : date.toLocaleDateString('fr-FR'),
      };
    });
  }, [backendData]);

  // Filtrer par source
  const measurements = useMemo(() => {
    return allMeasurements.filter(m => {
      if (sourceFilter === 'all') return true;
      return m.source === sourceFilter;
    });
  }, [allMeasurements, sourceFilter]);

  // NOUVEAU: Filtrer pour afficher seulement les 5 dernières
  const filteredMeasurements = useMemo(() => {
    const filtered = measurements.filter(m => {
      if (sourceFilter === 'all') return true;
      return m.source === sourceFilter;
    });
    return filtered.slice(0, 5); // Afficher seulement les 5 premières
  }, [measurements, sourceFilter]);

  // NOUVEAU: Fonction pour rediriger vers Glycemia
  const handleViewAll = () => {
    navigation.navigate('Glycemia');
  };

  // ... reste du code (stats, chartData, etc.) inchangé ...
  // Calculer les statistiques réelles
  const stats: GlucoseStats = useMemo(() => {
    if (measurements.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        timeInRange: 0,
        stability: 'Faible',
        variability: 0,
      };
    }

    const values = measurements.map(m => m.value);
    const average = Math.round(
      values.reduce((a, b) => a + b, 0) / values.length
    );
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculer le temps dans la cible (70-180 mg/dL)
    const inRange = values.filter(
      v => v >= GLYCEMIA_TARGET.MIN && v <= GLYCEMIA_TARGET.MAX
    ).length;
    const timeInRange = Math.round((inRange / values.length) * 100);

    // Calculer la variabilité (écart-type)
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) /
      values.length;
    const variability = Math.round(Math.sqrt(variance));

    // Déterminer la stabilité
    let stability: 'Bon' | 'Moyen' | 'Faible' = 'Bon';
    if (variability > 40) stability = 'Faible';
    else if (variability > 25) stability = 'Moyen';

    return {
      average,
      min,
      max,
      timeInRange,
      stability,
      variability,
    };
  }, [measurements]);

  // Générer les données du graphique à partir des vraies mesures
  const chartData = useMemo(() => {
    if (measurements.length === 0) {
      return {
        labels: ['00:00', '06:00', '12:00', '18:00'],
        datasets: [{ data: [100, 100, 100, 100] }],
      };
    }

    // Grouper par intervalles de temps selon la période
    const sortedMeasurements = [...measurements].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    let labels: string[];
    let dataPoints: number[];

    if (selectedPeriod === 'Jour') {
      // Par tranches de 4h pour la journée
      labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      dataPoints = new Array(6).fill(0);
      const counts = new Array(6).fill(0);

      measurements.forEach(m => {
        const hour = parseInt(m.time.split(':')[0]);
        const index = Math.floor(hour / 4);
        if (index < 6) {
          dataPoints[index] += m.value;
          counts[index]++;
        }
      });

      dataPoints = dataPoints.map((sum, i) =>
        counts[i] > 0 ? Math.round(sum / counts[i]) : 100
      );
    } else if (selectedPeriod === 'Semaine') {
      // Par jour de la semaine
      labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      dataPoints = new Array(7).fill(0);
      const counts = new Array(7).fill(0);

      measurements.forEach(m => {
        const date = new Date();
        const dayOfWeek = date.getDay();
        const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        dataPoints[index] += m.value;
        counts[index]++;
      });

      dataPoints = dataPoints.map((sum, i) =>
        counts[i] > 0 ? Math.round(sum / counts[i]) : 100
      );
    } else {
      // Par semaine du mois
      labels = ['S1', 'S2', 'S3', 'S4'];
      dataPoints = new Array(4).fill(0);
      const counts = new Array(4).fill(0);

      measurements.forEach(m => {
        const weekIndex = Math.min(
          3,
          Math.floor(measurements.indexOf(m) / (measurements.length / 4))
        );
        dataPoints[weekIndex] += m.value;
        counts[weekIndex]++;
      });

      dataPoints = dataPoints.map((sum, i) =>
        counts[i] > 0 ? Math.round(sum / counts[i]) : 100
      );
    }

    return {
      labels,
      datasets: [{ data: dataPoints }],
    };
  }, [measurements, selectedPeriod]);

  const getGlucoseColor = (value: number): string => {
    const { color } = getGlycemiaStatusColor(value);
    return color;
  };

  const getGlucoseStatus = (
    value: number
  ): { label: string; color: string } => {
    if (value < GLYCEMIA_TARGET.MIN)
      return { label: 'Bas', color: getGlycemiaStatusColor(value).color };
    if (value > GLYCEMIA_TARGET.MAX)
      return { label: 'Haut', color: getGlycemiaStatusColor(value).color };
    return { label: 'Normal', color: getGlycemiaStatusColor(value).color };
  };

  const exportToCSV = async (): Promise<void> => {
    // Créer le contenu CSV
    const csvHeader = 'Date,Heure,Valeur (mg/dL),Contexte,Source\n';
    const csvRows = measurements
      .map(
        m =>
          `${m.date},${m.time},${m.value},${m.context},${m.source === 'manual' ? 'Manuel' : 'CGM'}`
      )
      .join('\n');
    const csvContent = csvHeader + csvRows;

    try {
      await Share.share({
        message: csvContent,
        title: 'Export Glycémie',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  return (
    <Layout
      navigation={navigation}
      currentRoute="Home"
      userName="Utilisateur"
      onNotificationPress={() => console.log('Notifications')}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#007AFF"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Suivi Glucose</Text>
              <Text style={styles.subtitle}>Historique et tendances</Text>
            </View>
            <TouchableOpacity style={styles.calendarButton}>
              <Calendar size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Filtres de période */}
          <View style={styles.periodFilters}>
            {(['Jour', 'Semaine', 'Mois'] as PeriodFilter[]).map(period => (
              <TouchableOpacity
                key={period}
                onPress={() => setSelectedPeriod(period)}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === period && styles.periodTextActive,
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Graphique */}
          <GlycemiaChart chartData={chartData} />

          {/* Cartes statistiques */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Moyenne</Text>
              <Text style={styles.statValue}>{stats.average}</Text>
              <Text style={styles.statUnit}>mg/dL</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Minimum</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>
                {stats.min}
              </Text>
              <Text style={styles.statUnit}>mg/dL</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Maximum</Text>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                {stats.max}
              </Text>
              <Text style={styles.statUnit}>mg/dL</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Temps cible</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                {stats.timeInRange}%
              </Text>
              <Text style={styles.statUnit}>
                dans {GLYCEMIA_TARGET.MIN}-{GLYCEMIA_TARGET.MAX}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Stabilité</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      stats.stability === 'Bon'
                        ? '#10B981'
                        : stats.stability === 'Moyen'
                          ? '#F59E0B'
                          : '#EF4444',
                  },
                ]}
              >
                {stats.stability}
              </Text>
              <Text style={styles.statUnit}>écart-type</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Variabilité</Text>
              <Text style={styles.statValue}>{stats.variability}</Text>
              <Text style={styles.statUnit}>mg/dL</Text>
            </View>
          </View>

          {/* Mesures récentes */}
          <View style={styles.measurementsSection}>
            <View style={styles.measurementsHeader}>
              <Text style={styles.sectionTitle}>Mesures récentes</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={exportToCSV}
                >
                  <Download size={16} color="#007AFF" />
                  <Text style={styles.exportText}>Export CSV</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filtres de source */}
            <View style={styles.sourceFilters}>
              <TouchableOpacity
                onPress={() => setSourceFilter('all')}
                style={[
                  styles.sourceFilter,
                  sourceFilter === 'all' && styles.sourceFilterActive,
                ]}
              >
                <Text
                  style={[
                    styles.sourceFilterText,
                    sourceFilter === 'all' && styles.sourceFilterTextActive,
                  ]}
                >
                  Toutes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSourceFilter('manual')}
                style={[
                  styles.sourceFilter,
                  sourceFilter === 'manual' && styles.sourceFilterActive,
                ]}
              >
                <Text
                  style={[
                    styles.sourceFilterText,
                    sourceFilter === 'manual' && styles.sourceFilterTextActive,
                  ]}
                >
                  Manuel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSourceFilter('cgm')}
                style={[
                  styles.sourceFilter,
                  sourceFilter === 'cgm' && styles.sourceFilterActive,
                ]}
              >
                <Text
                  style={[
                    styles.sourceFilterText,
                    sourceFilter === 'cgm' && styles.sourceFilterTextActive,
                  ]}
                >
                  CGM
                </Text>
              </TouchableOpacity>
            </View>

            {/* Liste des mesures - MODIFIÉ pour afficher seulement 5 */}
            <View style={styles.measurementsList}>
              {filteredMeasurements.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Aucune mesure disponible</Text>
                </View>
              ) : (
                filteredMeasurements.map(measurement => {
                  const status = getGlucoseStatus(measurement.value);
                  return (
                    <View key={measurement.id} style={styles.measurementCard}>
                      <View style={styles.measurementLeft}>
                        <View
                          style={[
                            styles.measurementValue,
                            {
                              backgroundColor: `${getGlucoseColor(measurement.value)}20`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.measurementNumber,
                              { color: getGlucoseColor(measurement.value) },
                            ]}
                          >
                            {measurement.value}
                          </Text>
                          <Text
                            style={[
                              styles.measurementUnit,
                              { color: getGlucoseColor(measurement.value) },
                            ]}
                          >
                            mg/dL
                          </Text>
                        </View>
                        <View style={styles.measurementInfo}>
                          <Text style={styles.measurementTime}>
                            {measurement.date}, {measurement.time}
                          </Text>
                          <View style={styles.measurementTags}>
                            <View
                              style={[
                                styles.contextBadge,
                                { backgroundColor: '#EBF5FF' },
                              ]}
                            >
                              <Text style={styles.contextText}>
                                🍽️ {measurement.context}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.sourceBadge,
                                {
                                  backgroundColor:
                                    measurement.source === 'manual'
                                      ? '#F3E8FF'
                                      : '#E0F2FE',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sourceText,
                                  {
                                    color:
                                      measurement.source === 'manual'
                                        ? '#7C3AED'
                                        : '#0284C7',
                                  },
                                ]}
                              >
                                {measurement.source === 'manual'
                                  ? '✏️ Manuel'
                                  : '📊 CGM'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${status.color}20` },
                        ]}
                      >
                        <CheckCircle size={16} color={status.color} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* MODIFIÉ: Bouton "Tout voir" redirige vers Glycemia */}
            {measurements.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAll}
              >
                <Text style={styles.viewAllText}>
                  Tout voir ({measurements.length} mesures)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Comprendre vos statistiques */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>💡 Comprendre vos statistiques</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Temps dans la cible :</Text>{' '}
                  L'objectif est de rester au moins 70% du temps entre{' '}
                  {GLYCEMIA_TARGET.MIN}-{GLYCEMIA_TARGET.MAX} mg/dL (Time In
                  Range)
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Variabilité :</Text> Un
                  écart-type ≤ 36 mg/dL indique une glycémie stable
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoDot} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Stabilité :</Text> Compare la
                  constance de vos niveaux sur la période sélectionnée
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  calendarButton: {
    width: 48,
    height: 48,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodFilters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  measurementsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  measurementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  sourceFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sourceFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  sourceFilterActive: {
    backgroundColor: '#EBF5FF',
  },
  sourceFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sourceFilterTextActive: {
    color: '#007AFF',
  },
  measurementsList: {
    gap: 12,
  },
  measurementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  measurementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  measurementValue: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  measurementNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  measurementUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  measurementInfo: {
    flex: 1,
  },
  measurementTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  measurementTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  contextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contextText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  infoSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginRight: 10,
    marginTop: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bottomPadding: {
    height: 100,
  },
});
