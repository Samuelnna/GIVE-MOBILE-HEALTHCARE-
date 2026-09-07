import React from 'react';
import { PhoneXMarkIcon } from './IconComponents';
import { jitsiUrl, roomForCall, type VideoCallTarget } from '../utils/video';

interface VideoCallProps {
  participant: VideoCallTarget;
  currentUserId?: string;
  currentUserName?: string;
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ participant, currentUserId, currentUserName, onEndCall }) => {
  const roomName = roomForCall(participant, currentUserId);
  const displayName = currentUserName || 'MobileDoc';
  const url = roomName ? jitsiUrl(roomName, displayName) : '';

  if (!url) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center text-white p-6">
        <p className="font-bold mb-4">This call has no shared room.</p>
        <button onClick={onEndCall} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-sm">Close</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col animate-fade-in">
      <div className="bg-slate-800 p-4 flex justify-between items-center text-white border-b border-slate-700 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {participant.imageUrl ? (
            <img src={participant.imageUrl} alt={participant.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-black">
              {participant.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-bold truncate">Call with {participant.name}</h2>
            <p className="text-[10px] text-slate-400 font-medium truncate">Same room for both sides · {roomName}</p>
          </div>
        </div>
        <button
          onClick={onEndCall}
          className="bg-red-600 hover:bg-red-700 p-2 rounded-lg flex items-center gap-2 transition-colors font-bold text-sm flex-shrink-0"
        >
          <PhoneXMarkIcon className="h-5 w-5" />
          End Call
        </button>
      </div>

      <div className="flex-1 bg-black">
        <iframe
          src={url}
          allow="camera; microphone; display-capture; autoplay; clipboard-write; self"
          className="w-full h-full border-none"
          title="Video Call"
        />
      </div>
    </div>
  );
};

export default VideoCall;
