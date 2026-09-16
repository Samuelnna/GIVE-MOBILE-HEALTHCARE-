export function consultRoomName(appointmentId: string) {
  const safe = String(appointmentId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return `MobileDocConsult-${safe || 'unknown'}`;
}

export function chatRoomName(userA: string, userB: string) {
  const [first, second] = [String(userA), String(userB)].sort();
  return `MobileDocChat-${first.slice(0, 8)}-${second.slice(0, 8)}`;
}

export function jitsiUrl(room: string, displayName: string) {
  const name = encodeURIComponent(displayName.replace(/[<>"]/g, '').slice(0, 60) || 'MobileDoc');
  return `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&userInfo.displayName="${name}"`;
}

export function canJoinConsult(type?: string, status?: string) {
  const kind = (type || '').toLowerCase();
  const state = (status || '').toLowerCase();
  const isVideo = kind.includes('video');
  const open = state === 'upcoming' || state === 'pending';
  return isVideo && open;
}
