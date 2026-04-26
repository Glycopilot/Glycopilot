import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stethoscope, Phone, Mail, MapPin, UserPlus, Clock, Check, X } from 'lucide-react-native';
import { colors } from '../../themes/colors';

export interface Doctor {
  name: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface PendingInvite {
  id_team_member: string;
  doctorName: string;
  specialty: string | null;
  direction: 'sent' | 'received';
}

interface DoctorCardProps {
  readonly doctor: Doctor | null;
  readonly pendingInvites: PendingInvite[];
  readonly onCall: () => void;
  readonly onInvite: () => void;
  readonly onAcceptInvite: (id: string) => void;
  readonly onCancelInvite: (id: string) => void;
  readonly onRemoveDoctor: () => void;
  readonly acceptingId: string | null;
  readonly cancelingId: string | null;
  readonly removingDoctor: boolean;
}

export default function DoctorCard({
  doctor,
  pendingInvites,
  onCall,
  onInvite,
  onAcceptInvite,
  onCancelInvite,
  onRemoveDoctor,
  acceptingId,
  cancelingId,
  removingDoctor,
}: DoctorCardProps): React.JSX.Element {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Stethoscope size={20} color={colors.textPrimary} />
          <Text style={styles.sectionTitle}>Médecin traitant</Text>
        </View>
      </View>

      {pendingInvites.map(invite => (
        <View key={invite.id_team_member} style={styles.pendingCard}>
          <View style={[styles.pendingAvatar, invite.direction === 'sent' && styles.pendingAvatarSent]}>
            <Clock size={20} color={invite.direction === 'sent' ? '#6B7280' : '#F59E0B'} />
          </View>
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingName}>{invite.doctorName}</Text>
            {invite.specialty ? (
              <Text style={[styles.pendingSpecialty, invite.direction === 'sent' && styles.pendingSpecialtySent]}>
                {invite.specialty}
              </Text>
            ) : null}
            <Text style={[styles.pendingLabel, invite.direction === 'sent' && styles.pendingLabelSent]}>
              {invite.direction === 'sent' ? 'En attente de confirmation' : 'Invitation reçue'}
            </Text>
          </View>
          {invite.direction === 'received' ? (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => onAcceptInvite(invite.id_team_member)}
              disabled={acceptingId === invite.id_team_member}
            >
              {acceptingId === invite.id_team_member ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accepter</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onCancelInvite(invite.id_team_member)}
              disabled={cancelingId === invite.id_team_member}
            >
              {cancelingId === invite.id_team_member ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <>
                  <X size={16} color="#6B7280" />
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      ))}

      {doctor && (
        <View style={styles.card}>
          <View style={styles.doctorInfo}>
            <View style={styles.doctorAvatar}>
              <Stethoscope size={24} color="#007AFF" strokeWidth={2} />
            </View>
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              {doctor.specialty ? (
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onRemoveDoctor}
              disabled={removingDoctor}
            >
              {removingDoctor ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <X size={18} color="#EF4444" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.contactDetails}>
            {doctor.phone ? (
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <Phone size={16} color="#007AFF" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Téléphone</Text>
                  <Text style={styles.contactValue}>{doctor.phone}</Text>
                </View>
              </View>
            ) : null}

            {doctor.email ? (
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <Mail size={16} color="#007AFF" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{doctor.email}</Text>
                </View>
              </View>
            ) : null}

            {doctor.address ? (
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <MapPin size={16} color="#007AFF" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Adresse</Text>
                  <Text style={styles.contactValue}>{doctor.address}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {doctor.phone ? (
            <TouchableOpacity style={styles.callButton} onPress={onCall}>
              <Phone size={18} color="#fff" />
              <Text style={styles.callButtonText}>Appeler</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {!doctor && pendingInvites.length === 0 && (
        <View style={styles.emptyCard}>
          <View style={styles.emptyAvatar}>
            <Stethoscope size={32} color="#9CA3AF" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Aucun médecin traitant</Text>
          <Text style={styles.emptyText}>
            Invitez votre médecin à suivre vos données de santé
          </Text>
          <TouchableOpacity style={styles.inviteButton} onPress={onInvite}>
            <UserPlus size={18} color="#fff" />
            <Text style={styles.inviteButtonText}>Inviter un médecin</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  pendingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  pendingSpecialty: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 2,
  },
  pendingAvatarSent: {
    backgroundColor: '#F3F4F6',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#92400E',
  },
  pendingLabelSent: {
    color: '#6B7280',
  },
  pendingSpecialtySent: {
    color: '#9CA3AF',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 90,
    justifyContent: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 90,
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorDetails: {
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  contactDetails: {
    gap: 16,
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    gap: 12,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 14,
    borderRadius: 12,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
