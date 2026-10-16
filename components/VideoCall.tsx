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
  const apiRef = useRef<any>(null);
  const [muted, setMuted] = useState<boolean | null>(null);
  const [audioAvailable, setAudioAvailable] = useState<boolean | null>(null);
  const [audioTest, setAudioTest] = useState('');
  const [testing, setTesting] = useState(false);
  const testCleanup = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; testCleanup.current?.(); }; }, []);
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
          configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: false, startWithVideoMuted: audioOnly, startAudioOnly: audioOnly,
            enableNoAudioDetection: true, enableNoisyMicDetection: true },
        });
        apiRef.current = api;
        api.addListener('videoConferenceJoined', () => {
          clearTimeout(timer); setError(''); setState('Joined. Waiting for the other participant to connect…');
          void api.isAudioMuted().then((value: boolean) => { if (!stopped) setMuted(value); }).catch(() => {});
          void api.isAudioAvailable().then((value: boolean) => { if (!stopped) setAudioAvailable(value); }).catch(() => {});
        });
        api.addListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => { if (!stopped) setMuted(muted); });
        api.addListener('audioAvailabilityChanged', ({ available }: { available: boolean }) => { if (!stopped) setAudioAvailable(available); });
        api.addListener('participantJoined', () => { setError(''); setState('Participant connected'); });
        api.addListener('participantLeft', () => setState('The other participant disconnected. Waiting for them to rejoin…'));
        api.addListener('cameraError', () => setError('Camera unavailable. Check browser permissions and close other apps using the camera.'));
        api.addListener('micError', () => setError('Microphone unavailable. Check browser permissions and your selected input device.'));
        api.addListener('errorOccurred', () => setError('The call service reported a connection error. Check your network or try opening the call in a new tab.'));
        api.addListener('readyToClose', () => { if (!stopped) endRef.current(); });
      } catch (error) { if (!stopped) setError(error instanceof Error ? error.message : 'Could not start the call.'); }
    })();
    return () => { stopped = true; clearTimeout(timer); apiRef.current = null; api?.dispose(); };
  }, [room, domain, audioOnly, currentUserName]);
  const testMicrophone = async () => {
    setTesting(true); setAudioTest('Speak for four seconds…');
    let stream: MediaStream | undefined, context: AudioContext | undefined, interval: number | undefined, timer: number | undefined;
    const cleanup = () => {
      window.clearInterval(interval); window.clearTimeout(timer);
      stream?.getTracks().forEach(track => track.stop());
      if (context && context.state !== 'closed') void context.close();
    };
    testCleanup.current = cleanup;
    try {
      context = new AudioContext(); await context.resume();
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!mounted.current) { cleanup(); return; }
      const analyser = context.createAnalyser(); analyser.fftSize = 2048;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize); let peak = 0;
      interval = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
        peak = Math.max(peak, rms);
      }, 100);
      timer = window.setTimeout(() => {
        cleanup(); setTesting(false);
        setAudioTest(peak > 0.008 ? 'Your browser detects microphone sound. If the other person still hears nothing, select this microphone in the call’s audio settings and check that you are unmuted.' : 'No microphone sound detected. Check the selected input, microphone permission, and hardware mute switch.');
      }, 4000);
    } catch (error) {
      cleanup(); setTesting(false); setAudioTest(error instanceof Error ? `Microphone test failed: ${error.message}` : 'Microphone test failed.');
    }
  };
  const testSpeaker = async () => {
    const context = new AudioContext();
    try {
      await context.resume();
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.frequency.value = 440; gain.gain.value = 0.08;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.5);
      oscillator.onended = () => { void context.close(); };
      setAudioTest('A short tone was played. If you did not hear it, check device volume, browser tab mute, and headphones/Bluetooth output. This tests browser sound, not the remote call audio.');
    } catch { void context.close(); setAudioTest('Browser audio could not start. Check sound permissions and try again.'); }
  };
  const link = `https://${domain}/${encodeURIComponent(room)}#config.startWithVideoMuted=${audioOnly}`;
  return <div className="fixed inset-0 bg-slate-900 z-[70] flex flex-col text-white">
    <header className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-800">
      <div><h2 className="font-bold">{audioOnly ? 'Voice' : 'Video'} call with {participant.name}</h2><p className="text-xs text-slate-300">{state}</p></div>
      <div className="flex gap-4 items-center"><a href={link} target="_blank" rel="noreferrer" className="text-sm underline">Open call in new tab</a><button onClick={onEndCall} className="bg-red-600 rounded-lg px-4 py-2 font-bold">End call</button></div>
    </header>
    <div className="bg-slate-800 px-4 pb-3 flex flex-wrap items-center gap-3 text-sm">
      <span role="status">{audioAvailable === false ? 'Microphone unavailable' : muted === null ? 'Checking microphone…' : muted ? 'Microphone muted' : 'Microphone unmuted'}</span>
      <button disabled={muted === null || audioAvailable === false} onClick={() => apiRef.current?.executeCommand('toggleAudio')} className="border border-slate-500 rounded px-3 py-1 disabled:opacity-50">{muted ? 'Unmute microphone' : 'Mute microphone'}</button>
      <button disabled={testing} onClick={() => void testMicrophone()} className="border border-slate-500 rounded px-3 py-1 disabled:opacity-50">{testing ? 'Testing…' : 'Test microphone'}</button>
      <button onClick={() => void testSpeaker()} className="border border-slate-500 rounded px-3 py-1">Test speaker</button>
      {audioTest && <p role="status" className="w-full text-xs text-slate-200">{audioTest}</p>}
    </div>
    {error && <div role="alert" className="bg-amber-100 text-amber-950 p-3 text-sm">{error}</div>}
    <div ref={parent} className="flex-1 min-h-0 bg-black" />
  </div>;
};
export default VideoCall;

