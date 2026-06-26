import React, { useState } from 'react';
import { PhoneXMarkIcon } from './IconComponents';

interface VideoCallProps {
  participant: {
    name: string;
    imageUrl: string;
  };
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({ participant, onEndCall }) => {
  // Use Jitsi Meet for a functional, free, no-key video call solution
  const roomName = `MobileHealth-${participant.name.replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","embedview","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`;

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-slate-800 p-4 flex justify-between items-center text-white border-b border-slate-700">
        <div className="flex items-center gap-3">
          <img src={participant.imageUrl} alt={participant.name} className="w-8 h-8 rounded-full object-cover" />
          <h2 className="font-bold">Call with {participant.name}</h2>
        </div>
        <button 
          onClick={onEndCall} 
          className="bg-red-600 hover:bg-red-700 p-2 rounded-lg flex items-center gap-2 transition-colors font-bold text-sm"
        >
          <PhoneXMarkIcon className="h-5 w-5" />
          End Call
        </button>
      </div>

      {/* Jitsi Iframe */}
      <div className="flex-1 bg-black">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; display-capture; autoplay; clipboard-write; self"
          className="w-full h-full border-none"
          title="Video Call"
        />
      </div>
    </div>
  );
};

export default VideoCall;
