export function isReceivedByDoctor(inv) {
  if (inv?.invitation_from === 'patient') return true;
  if (inv?.invitation_from === 'doctor') return false;
  return inv?.approved_by == null;
}

export function isSentByDoctor(inv) {
  return !isReceivedByDoctor(inv);
}

export function countReceivedInvites(pendingInvites = [], activePatients = []) {
  return dedupeDoctorTeamLists({
    pending_invites: pendingInvites,
    active_patients: activePatients,
  }).receivedInvites.length;
}

export function patientIdentityKey(member) {
  const p = member?.patient_details;
  if (p?.id_user != null) return `user:${p.id_user}`;
  if (p?.email) return `email:${String(p.email).trim().toLowerCase()}`;
  if (member?.patient_profile) return `profile:${member.patient_profile}`;
  if (member?.invitation_email) {
    return `email:${String(member.invitation_email).trim().toLowerCase()}`;
  }
  return member?.id_team_member ? `team:${member.id_team_member}` : null;
}

export function isSamePatient(a, b) {
  const ka = patientIdentityKey(a);
  const kb = patientIdentityKey(b);
  if (ka && kb && ka === kb) return true;
  const pa = a?.patient_details;
  const pb = b?.patient_details;
  if (pa?.id_user != null && pb?.id_user != null && pa.id_user === pb.id_user) return true;
  if (pa?.email && pb?.email && pa.email.toLowerCase() === pb.email.toLowerCase()) return true;
  return false;
}

function isAlreadyActivePatient(invite, activePatients) {
  return activePatients.some((active) => isSamePatient(invite, active));
}

function uniqueByTeamId(list) {
  const seen = new Set();
  return list.filter((row) => {
    const id = row?.id_team_member;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function dedupeDoctorTeamLists({ active_patients = [], pending_invites = [] } = {}) {
  const active = uniqueByTeamId(active_patients ?? []);
  const pending = uniqueByTeamId(pending_invites ?? []);

  const receivedInvites = pending
    .filter(isReceivedByDoctor)
    .filter((inv) => !isAlreadyActivePatient(inv, active));

  const sentInvites = pending
    .filter(isSentByDoctor)
    .filter((inv) => !isAlreadyActivePatient(inv, active));

  return {
    activePatients: active,
    receivedInvites,
    sentInvites,
    allMembers: [
      ...receivedInvites.map((m) => ({ ...m, _type: 'received' })),
      ...active.map((m) => ({ ...m, _type: 'active' })),
      ...sentInvites.map((m) => ({ ...m, _type: 'sent' })),
    ],
  };
}
