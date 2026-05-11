import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  FileText,
  HeartPulse,
  Home,
  MessageCircle,
  Paperclip,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react-native';

const colors = {
  purple: '#A78BFA',
  purpleDark: '#7C3AED',
  purplePale: '#F3EFFF',
  bg: '#F7F3FF',
  dark: '#1A2B45',
  mid: '#334155',
  muted: '#94A3B8',
  border: '#E2E8F0',
  surface: '#FFFFFF',
  green: '#16A34A',
  orange: '#F97316',
  red: '#DC2626',
  teal: '#0D9488',
};

type ViewName = 'dashboard' | 'messages' | 'profile';
type Author = 'relative' | 'patient';

type Message = {
  id: number;
  author: Author;
  text: string;
  time: string;
  edited?: boolean;
  attachment?: {
    name: string;
    size?: number;
    mimeType?: string;
    uri?: string;
  };
};

const patient = {
  firstName: 'Yanis',
  lastName: 'Gherdane',
  age: 22,
  relation: 'Frère',
  diabetesType: 'Diabète type 1',
  phone: '+33 6 12 34 56 78',
  lastMeasureAt: '18:30',
  currentGlucose: 0.92,
  targetRange: '0.70 - 1.80 g/L',
  nextMedication: 'Insuline lente à 21:00',
};

const glucoseReadings = [
  { time: '06:30', value: 0.82 },
  { time: '08:00', value: 1.06 },
  { time: '10:30', value: 1.22 },
  { time: '12:45', value: 1.74 },
  { time: '14:10', value: 1.58 },
  { time: '16:00', value: 1.14 },
  { time: '18:30', value: 0.92 },
];

const storageKey = 'glycopilot_relative_mobile_messages';

const initialMessages: Message[] = [
  {
    id: 1,
    author: 'patient',
    text: 'Je viens de faire ma mesure, je suis à 0.92 g/L.',
    time: '18:31',
  },
  {
    id: 2,
    author: 'relative',
    text: 'Parfait, merci. Tu as prévu de manger bientôt ?',
    time: '18:32',
  },
  {
    id: 3,
    author: 'patient',
    text: 'Oui, dans 30 minutes. Je note le repas après.',
    time: '18:34',
  },
];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
}

function getNowLabel() {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function getGlycemiaStatus(value: number) {
  if (value < 0.7) return { label: 'Hypoglycémie', color: colors.red, bg: '#FEE2E2' };
  if (value > 1.8) return { label: 'Hyperglycémie', color: colors.red, bg: '#FEE2E2' };
  if (value > 1.5) return { label: 'À surveiller', color: colors.orange, bg: '#FFEDD5' };
  return { label: 'Dans la cible', color: colors.green, bg: '#DCFCE7' };
}

function ScreenHeader({ currentView, setCurrentView }: { currentView: ViewName; setCurrentView: (view: ViewName) => void }) {
  const items: Array<{ id: ViewName; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Surveillance', icon: <Home size={18} /> },
    { id: 'messages', label: 'Messages', icon: <MessageCircle size={18} /> },
    { id: 'profile', label: 'Profil', icon: <UserRound size={18} /> },
  ];

  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>G</Text>
        </View>
        <View>
          <Text style={styles.brandName}>GlycoPilot</Text>
          <Text style={styles.brandSubtitle}>Proche mobile</Text>
        </View>
      </View>
      <View style={styles.tabRow}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.tabButton, currentView === item.id && styles.tabButtonActive]}
            onPress={() => setCurrentView(item.id)}
          >
            {item.icon}
            <Text style={[styles.tabText, currentView === item.id && styles.tabTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function GlycemiaChart() {
  const width = 330;
  const height = 170;
  const pad = 18;
  const min = 0.5;
  const max = 2.1;
  const xStep = (width - pad * 2) / (glucoseReadings.length - 1);
  const toX = (index: number) => pad + index * xStep;
  const toY = (value: number) => height - pad - ((value - min) / (max - min)) * (height - pad * 2);
  const points = glucoseReadings.map((reading, index) => `${toX(index)},${toY(reading.value)}`).join(' ');
  const areaPath = `M ${toX(0)} ${height - pad} L ${glucoseReadings
    .map((reading, index) => `${toX(index)} ${toY(reading.value)}`)
    .join(' L ')} L ${toX(glucoseReadings.length - 1)} ${height - pad} Z`;

  return (
    <View style={styles.chartCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>Courbe du jour</Text>
          <Text style={styles.sectionTitle}>Évolution glycémique</Text>
        </View>
        <Text style={styles.rangeChip}>Cible</Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.purple} stopOpacity="0.24" />
            <Stop offset="100%" stopColor={colors.purple} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x={pad} y={toY(1.8)} width={width - pad * 2} height={toY(0.7) - toY(1.8)} rx="8" fill={colors.green} opacity="0.09" />
        <Path d={areaPath} fill="url(#area)" />
        <Polyline points={points} fill="none" stroke={colors.purple} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {glucoseReadings.map((reading, index) => {
          const status = getGlycemiaStatus(reading.value);
          return (
            <React.Fragment key={reading.time}>
              <Circle cx={toX(index)} cy={toY(reading.value)} r="6" fill={status.color} stroke="#fff" strokeWidth="3" />
              <SvgText x={toX(index)} y={height - 2} fill={colors.muted} fontSize="10" fontWeight="800" textAnchor="middle">
                {reading.time.split(':')[0]}h
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function KpiCard({ icon, value, label, chip }: { icon: React.ReactNode; value: string; label: string; chip?: string }) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiIcon}>{icon}</View>
      <View style={styles.kpiCopy}>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      {chip ? <Text style={styles.kpiChip}>{chip}</Text> : null}
    </View>
  );
}

function DashboardScreen({ setCurrentView }: { setCurrentView: (view: ViewName) => void }) {
  const status = getGlycemiaStatus(patient.currentGlucose);
  const highReadings = glucoseReadings.filter((reading) => reading.value > 1.5).length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.pageTitleRow}>
        <View style={styles.pageTitleCopy}>
          <Text style={styles.eyebrow}>Espace proche</Text>
          <Text style={styles.pageTitle}>Surveillance de {patient.firstName}</Text>
          <Text style={styles.pageSubtitle}>{patient.relation} · {patient.diabetesType} · Dernière mesure à {patient.lastMeasureAt}</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={() => setCurrentView('messages')}>
          <MessageCircle size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Écrire</Text>
        </Pressable>
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard icon={<Activity size={22} color={colors.purpleDark} />} value={patient.currentGlucose.toFixed(2)} label="g/L maintenant" chip={status.label} />
        <KpiCard icon={<ShieldCheck size={22} color={colors.green} />} value="86%" label="temps dans la cible" />
        <KpiCard icon={<AlertTriangle size={22} color={colors.orange} />} value={String(highReadings)} label="points à surveiller" />
        <KpiCard icon={<Bell size={22} color={colors.teal} />} value="21:00" label="prochain rappel" />
      </View>

      <GlycemiaChart />

      <View style={styles.patientCard}>
        <View style={styles.patientTop}>
          <View style={styles.patientAvatar}>
            <Text style={styles.avatarText}>{initials(patient.firstName, patient.lastName)}</Text>
          </View>
          <View>
            <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
            <Text style={styles.patientMeta}>{patient.age} ans · {patient.relation}</Text>
          </View>
        </View>
        <InfoRow label="Tendance" value="Stable après repas" />
        <InfoRow label="Traitement" value={patient.nextMedication} />
        <InfoRow label="Téléphone patient" value={patient.phone} />
        <Pressable style={styles.secondaryButton}>
          <Phone size={17} color={colors.purpleDark} />
          <Text style={styles.secondaryButtonText}>Appeler le patient</Text>
        </Pressable>
      </View>

      <View style={styles.eventsCard}>
        <Text style={styles.eyebrow}>Journal récent</Text>
        <Text style={styles.sectionTitle}>Événements importants</Text>
        <EventItem color={colors.green} title="Glycémie revenue dans la cible" body="0.92 g/L à 18:30, aucune action urgente requise." />
        <EventItem color={colors.orange} title="Pic post-repas à surveiller" body="1.74 g/L à 12:45, suivi recommandé après déjeuner." />
        <EventItem color={colors.purple} title="Message du patient" body={`${patient.firstName} a confirmé son prochain repas.`} />
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EventItem({ color, title, body }: { color: string; title: string; body: string }) {
  return (
    <View style={styles.eventItem}>
      <View style={[styles.eventDot, { backgroundColor: color }]} />
      <View style={styles.eventCopy}>
        <Text style={styles.eventTitle}>{title}</Text>
        <Text style={styles.eventBody}>{body}</Text>
      </View>
    </View>
  );
}

function MessagesScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState<Message['attachment']>(undefined);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored) setMessages(JSON.parse(stored));
    }).catch(() => {});
  }, []);

  const visibleMessages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return messages;
    return messages.filter((message) => `${message.text} ${message.attachment?.name || ''}`.toLowerCase().includes(normalized));
  }, [messages, query]);

  const persist = async (nextMessages: Message[]) => {
    setMessages(nextMessages);
    await AsyncStorage.setItem(storageKey, JSON.stringify(nextMessages));
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSelectedFile({
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
      uri: asset.uri,
    });
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text && !selectedFile) return;
    persist([
      ...messages,
      {
        id: Date.now(),
        author: 'relative',
        text,
        attachment: selectedFile,
        time: getNowLabel(),
      },
    ]);
    setDraft('');
    setSelectedFile(undefined);
  };

  const startEdit = (message: Message) => {
    setEditingId(message.id);
    setEditDraft(message.text);
  };

  const saveEdit = (messageId: number) => {
    const text = editDraft.trim();
    if (!text) return;
    persist(messages.map((message) => message.id === messageId ? { ...message, text, edited: true } : message));
    setEditingId(null);
    setEditDraft('');
  };

  const deleteMessage = (messageId: number) => {
    Alert.alert('Supprimer le message', 'Voulez-vous supprimer ce message ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => persist(messages.filter((message) => message.id !== messageId)) },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.messagesRoot}>
      <View style={styles.messagesHeader}>
        <View style={styles.chatAvatar}>
          <Text style={styles.avatarText}>{initials(patient.firstName, patient.lastName)}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.chatHeaderCopy}>
          <Text style={styles.chatTitle}>{patient.firstName} {patient.lastName}</Text>
          <Text style={styles.chatMeta}>Actif maintenant · {patient.diabetesType}</Text>
        </View>
      </View>

      <View style={styles.searchMessages}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher dans la conversation" placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>

      <ScrollView contentContainerStyle={styles.threadContent}>
        <Text style={styles.threadDay}>Aujourd'hui</Text>
        {visibleMessages.map((message) => (
          <View key={message.id} style={[styles.messageRow, message.author === 'relative' && styles.messageRowMe]}>
            {message.author === 'patient' ? (
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>{initials(patient.firstName, patient.lastName)}</Text>
              </View>
            ) : null}
            {message.author === 'relative' ? (
              <View style={styles.mobileMessageActions}>
                <Pressable onPress={() => startEdit(message)} style={styles.actionBubble}>
                  <Pencil size={13} color={colors.mid} />
                </Pressable>
                <Pressable onPress={() => deleteMessage(message.id)} style={styles.actionBubble}>
                  <Trash2 size={13} color={colors.mid} />
                </Pressable>
              </View>
            ) : null}
            <View style={[styles.messageBubble, message.author === 'relative' ? styles.messageMe : styles.messageThem]}>
              {editingId === message.id ? (
                <View style={styles.editBox}>
                  <TextInput value={editDraft} onChangeText={setEditDraft} style={styles.editInput} autoFocus />
                  <View style={styles.editActions}>
                    <Pressable onPress={() => setEditingId(null)}><Text style={styles.editActionText}>Annuler</Text></Pressable>
                    <Pressable onPress={() => saveEdit(message.id)}><Text style={styles.editActionText}>OK</Text></Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {message.text ? <Text style={[styles.messageText, message.author === 'relative' && styles.messageTextMe]}>{message.text}</Text> : null}
                  {message.attachment ? (
                    <View style={[styles.attachmentCard, message.author === 'relative' && styles.attachmentCardMe]}>
                      <FileText size={17} color={message.author === 'relative' ? '#fff' : colors.purpleDark} />
                      <Text style={[styles.attachmentText, message.author === 'relative' && styles.attachmentTextMe]}>{message.attachment.name}</Text>
                    </View>
                  ) : null}
                  <View style={styles.messageMetaRow}>
                    <Text style={[styles.messageTime, message.author === 'relative' && styles.messageTimeMe]}>{message.time}{message.edited ? ' · modifié' : ''}</Text>
                    {message.author === 'relative' ? <CheckCheck size={13} color="rgba(255,255,255,.78)" /> : null}
                  </View>
                </>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        {selectedFile ? (
          <View style={styles.selectedFile}>
            <FileText size={16} color={colors.purpleDark} />
            <Text style={styles.selectedFileText}>{selectedFile.name}</Text>
            <Pressable onPress={() => setSelectedFile(undefined)}><Text style={styles.removeFile}>×</Text></Pressable>
          </View>
        ) : null}
        <View style={styles.composerRow}>
          <Pressable onPress={pickFile} style={styles.composerButton}>
            <Paperclip size={20} color={colors.purpleDark} />
          </Pressable>
          <TextInput value={draft} onChangeText={setDraft} placeholder={`Message à ${patient.firstName}`} placeholderTextColor={colors.muted} style={styles.composerInput} />
          <Pressable onPress={sendMessage} style={styles.sendButton}>
            <Send size={19} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ProfileScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Profil proche</Text>
      <Text style={styles.pageTitle}>Accès de surveillance</Text>
      <Text style={styles.pageSubtitle}>Un proche peut être un membre de la famille, un voisin ou un intervenant d'aide à la personne.</Text>
      <View style={styles.profileCard}>
        <UsersRound size={28} color={colors.purpleDark} />
        <Text style={styles.profileTitle}>Rôle du proche</Text>
        <Text style={styles.profileBody}>Suivre les mesures, recevoir les alertes et garder un lien avec le patient sans remplacer le suivi médical.</Text>
      </View>
      <View style={styles.profileCard}>
        <HeartPulse size={28} color={colors.purpleDark} />
        <Text style={styles.profileTitle}>Responsabilité</Text>
        <Text style={styles.profileBody}>Surveillance bienveillante pour un enfant, une personne âgée, un voisin ou un bénéficiaire accompagné.</Text>
      </View>
      <View style={styles.profileCard}>
        <ShieldCheck size={28} color={colors.purpleDark} />
        <Text style={styles.profileTitle}>Droits d'accès</Text>
        <Text style={styles.profileBody}>Accès limité aux données nécessaires : mesures glycémiques, alertes, journal récent et messagerie patient.</Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewName>('dashboard');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader currentView={currentView} setCurrentView={setCurrentView} />
      {currentView === 'dashboard' ? <DashboardScreen setCurrentView={setCurrentView} /> : null}
      {currentView === 'messages' ? <MessagesScreen /> : null}
      {currentView === 'profile' ? <ProfileScreen /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  brandMarkText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  brandName: {
    color: colors.dark,
    fontSize: 16,
    fontWeight: '900',
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.purplePale,
  },
  tabButtonActive: {
    backgroundColor: colors.purple,
  },
  tabText: {
    color: colors.purpleDark,
    fontSize: 11,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    padding: 18,
    gap: 16,
  },
  pageTitleRow: {
    gap: 14,
  },
  pageTitleCopy: {
    gap: 5,
  },
  eyebrow: {
    color: colors.purpleDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pageTitle: {
    color: colors.dark,
    fontSize: 26,
    fontWeight: '900',
  },
  pageSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.purple,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  kpiGrid: {
    gap: 12,
  },
  kpiCard: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  kpiIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purplePale,
  },
  kpiCopy: {
    flex: 1,
  },
  kpiValue: {
    color: colors.dark,
    fontSize: 24,
    fontWeight: '900',
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  kpiChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    color: colors.green,
    backgroundColor: '#DCFCE7',
    fontSize: 11,
    fontWeight: '900',
  },
  chartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.dark,
    fontSize: 20,
    fontWeight: '900',
  },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    color: colors.green,
    backgroundColor: '#DCFCE7',
    fontSize: 12,
    fontWeight: '900',
  },
  patientCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface,
  },
  patientTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
  },
  patientName: {
    color: colors.dark,
    fontSize: 20,
    fontWeight: '900',
  },
  patientMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  infoRow: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 4,
    color: colors.dark,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.purplePale,
  },
  secondaryButtonText: {
    color: colors.purpleDark,
    fontWeight: '900',
  },
  eventsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface,
  },
  eventItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FBFDFF',
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  eventCopy: {
    flex: 1,
  },
  eventTitle: {
    color: colors.dark,
    fontWeight: '900',
  },
  eventBody: {
    marginTop: 4,
    color: colors.muted,
    lineHeight: 20,
  },
  messagesRoot: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: colors.green,
  },
  chatHeaderCopy: {
    flex: 1,
  },
  chatTitle: {
    color: colors.dark,
    fontSize: 18,
    fontWeight: '900',
  },
  chatMeta: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
  },
  searchMessages: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 16,
    color: colors.dark,
    backgroundColor: '#F0F2F5',
  },
  threadContent: {
    flexGrow: 1,
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  threadDay: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    color: colors.muted,
    backgroundColor: '#F0F4F9',
    fontSize: 12,
    fontWeight: '900',
  },
  messageRow: {
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMe: {
    alignSelf: 'flex-end',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  miniAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  mobileMessageActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F8',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
    borderRadius: 18,
  },
  messageThem: {
    borderBottomLeftRadius: 6,
    backgroundColor: '#F0F2F5',
  },
  messageMe: {
    borderBottomRightRadius: 6,
    backgroundColor: colors.purple,
  },
  messageText: {
    color: colors.dark,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 5,
  },
  messageTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,.78)',
  },
  attachmentCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  attachmentCardMe: {
    backgroundColor: 'rgba(255,255,255,.22)',
  },
  attachmentText: {
    flexShrink: 1,
    color: colors.purpleDark,
    fontSize: 13,
    fontWeight: '900',
  },
  attachmentTextMe: {
    color: '#fff',
  },
  editBox: {
    gap: 8,
  },
  editInput: {
    minWidth: 220,
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.dark,
    backgroundColor: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editActionText: {
    color: '#fff',
    fontWeight: '900',
  },
  composer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  selectedFileText: {
    flex: 1,
    color: colors.mid,
    fontSize: 13,
    fontWeight: '800',
  },
  removeFile: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '900',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purplePale,
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 16,
    color: colors.dark,
    backgroundColor: '#F0F2F5',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    gap: 10,
    backgroundColor: colors.surface,
  },
  profileTitle: {
    color: colors.dark,
    fontSize: 19,
    fontWeight: '900',
  },
  profileBody: {
    color: colors.muted,
    lineHeight: 21,
  },
});
