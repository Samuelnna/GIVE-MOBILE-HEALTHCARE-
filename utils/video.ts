export type VideoCallTarget = {
  name: string;
  imageUrl?: string;
  appointmentId?: string | number;
  peerId?: string;
};

function safeToken(value: string, max = 64) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, max);
}

export function consultRoomName(appointmentId: string | number) {
  return `MobileDocConsult-${safeToken(String(appointmentId)) || 'unknown'}`;
}

export function chatRoomName(userA: string, userB: string) {
  const [first, second] = [String(userA), String(userB)].sort();
  return `MobileDocChat-${safeToken(first, 8)}-${safeToken(second, 8)}`;
}

export function roomForCall(target: VideoCallTarget, currentUserId?: string) {
  if (target.appointmentId) return consultRoomName(target.appointmentId);
  if (target.peerId && currentUserId) return chatRoomName(currentUserId, target.peerId);
  return '';
}

export function jitsiUrl(room: string, displayName: string) {
  const name = encodeURIComponent(displayName.replace(/[<>"]/g, '').slice(0, 60) || 'MobileDoc');
  return `https://meet.jit.si/${room}#config.prejoinPageEnabled=false&userInfo.displayName="${name}"`;
}

export function canJoinConsult(type?: string, status?: string) {
  const kind = (type || '').toLowerCase();
  const state = (status || '').toLowerCase();
  const isCall = kind.includes('video') || kind.includes('audio');
  const open = state === 'upcoming' || state === 'pending';
  return isCall && open;
}
