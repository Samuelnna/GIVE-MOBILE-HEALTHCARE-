import React, { useEffect, useRef, useState } from 'react';
import { roomForCall, type VideoCallTarget } from '../utils/video';

interface Props { participant: VideoCallTarget; currentUserId?: string; currentUserName?: string; onEndCall: () => void }
let scriptPromise: Promise<void> | undefined;
function loadJitsi(domain: string) {
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = undefined; script.remove(); reject(new Error('The call service could not load. Check your connection.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
const VideoCall: React.FC<Props> = ({ participant, currentUserId, currentUserName, onEndCall }) => {
  const parent = useRef<HTMLDivElement>(null), endRef = useRef(onEndCall);
  endRef.current = onEndCall;
  const [state, setState] = useState('Connecting to the call service…'), [error, setError] = useState('');
  const room = roomForCall(participant, currentUserId);
  const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  const audioOnly = participant.mode === 'audio';
  useEffect(() => {
    let stopped = false, api: any;
    const timer = setTimeout(() => { if (!stopped) setError('Joining is taking longer than expected. Check camera/microphone permissions and whether the call service requires host sign-in.'); }, 30000);
    (async () => {
      try {
        if (!window.isSecureContext) throw new Error('Calls require HTTPS or localhost. Use a secure address on both devices.');
        if (!room || !/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(domain)) throw new Error('The call service configuration is invalid.');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support camera/microphone access.');
        // Detect permission failures before opening the embedded call, then release
        // these tracks so the conference can acquire the devices itself.
        const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: !audioOnly });
        media.getTracks().forEach(track => track.stop());
        if (stopped) return;
        await loadJitsi(domain);
        if (stopped || !parent.current) return;
        const API = (window as any).JitsiMeetExternalAPI;
        if (!API) throw new Error('The conferencing service did not initialize.');
        api = new API(domain, { roomName: room, parentNode: parent.current, width: '100%', height: '100%',
          userInfo: { displayName: currentUserName || 'MobileDoc' },
          configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: false, startWithVideoMuted: audioOnly, startAudioOnly: audioOnly },
        });
        api.addListener('videoConferenceJoined', () => { clearTimeout(timer); setError(''); setState('Joined. Waiting for the other participant to connect…'); });
        api.addListener('participantJoined', () => { setError(''); setState('Participant connected'); });
        api.addListener('participantLeft', () => setState('The other participant disconnected. Waiting for them to rejoin…'));
        api.addListener('cameraError', () => setError('Camera unavailable. Check browser permissions and close other apps using the camera.'));
        api.addListener('micError', () => setError('Microphone unavailable. Check browser permissions and your selected input device.'));
        api.addListener('errorOccurred', () => setError('The call service reported a connection error. Check your network or try opening the call in a new tab.'));
        api.addListener('readyToClose', () => endRef.current());
      } catch (error) { if (!stopped) setError(error instanceof Error ? error.message : 'Could not start the call.'); }
    })();
    return () => { stopped = true; clearTimeout(timer); api?.dispose(); };
  }, [room, domain, audioOnly, currentUserName]);
  const link = `https://${domain}/${encodeURIComponent(room)}#config.startWithVideoMuted=${audioOnly}`;
  return <div className="fixed inset-0 bg-slate-900 z-[70] flex flex-col text-white">
    <header className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-800">
      <div><h2 className="font-bold">{audioOnly ? 'Voice' : 'Video'} call with {participant.name}</h2><p className="text-xs text-slate-300">{state}</p></div>
      <div className="flex gap-4 items-center"><a href={link} target="_blank" rel="noreferrer" className="text-sm underline">Open call in new tab</a><button onClick={onEndCall} className="bg-red-600 rounded-lg px-4 py-2 font-bold">End call</button></div>
    </header>
    {error && <div role="alert" className="bg-amber-100 text-amber-950 p-3 text-sm">{error}</div>}
    <div ref={parent} className="flex-1 min-h-0 bg-black" />
  </div>;
};
export default VideoCall;

