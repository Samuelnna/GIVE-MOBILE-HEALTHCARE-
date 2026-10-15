
import React, { useState, useRef, useEffect } from 'react';
import { getAuthedUserId, supabase } from '../src/supabaseClient';
import { SendIcon, PhoneIcon, VideoCameraIcon, ChevronLeftIcon, CreditCardIcon } from '../components/IconComponents';
import { useNotification } from '../contexts/NotificationContext';

interface Convo {
    id: string;
    participant: { name: string; imageUrl: string; userType?: string; requiresConsultation?: boolean };
    messages: any[];
}

interface MessageRecipient {
    id: string;
    name: string;
    imageUrl: string;
    requiresConsultation?: boolean;
}

function isProfessionalProfile(profile: any) {
    if (profile?.user_type === 'professional') return true;
    const profileText = `${profile?.role || ''} ${profile?.specialty || ''}`;
    return /(doctor|physician|surgeon|consultant|general practitioner|gp|cardiologist|neurologist|pediatrician|dentist|nurse|midwife|pharmacist|lab scientist|laboratory scientist|specialist|therapist)/i.test(profileText);
}

const Messaging: React.FC<{
    onStartVideoCall: (p: any) => void;
    setActiveSection: (s: any) => void;
    initialRecipient?: MessageRecipient | null;
    onInitialRecipientHandled?: () => void;
}> = ({ onStartVideoCall, setActiveSection, initialRecipient, onInitialRecipientHandled }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const [conversations, setConversations] = useState<Convo[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Convo | null>(null);
  const [isGated, setIsGated] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [contactLoadError, setContactLoadError] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchConversations = async () => {
    const userId = await getAuthedUserId();
        if (!userId) return [] as Convo[];

    const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, image_url, user_type, role), receiver:profiles!messages_receiver_id_fkey(id, full_name, image_url, user_type, role)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });
    
    if (error) {
        setContactLoadError(`Conversations could not be loaded: ${error.message}`);
        return [] as Convo[];
    }
    if (data) {
        const groups: Record<string, Convo> = {};
        data.forEach(m => {
            const isMe = m.sender_id === userId;
            const otherUser = isMe ? m.receiver : m.sender;
            if (!otherUser) return;
            if (!groups[otherUser.id]) {
                groups[otherUser.id] = {
                    id: otherUser.id,
                    participant: {
                        name: (otherUser as any).full_name,
                        imageUrl: (otherUser as any).image_url || '',
                        userType: (otherUser as any).user_type,
                        requiresConsultation: isProfessionalProfile(otherUser),
                    },
                    messages: []
                };
            }
            groups[otherUser.id].messages.push({
                role: isMe ? 'user' : 'model',
                text: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'read'
            });
        });
        const list = Object.values(groups);
        setConversations(list);
        if (selectedConvo) {
            const updated = list.find(c => c.id === selectedConvo.id);
            if (updated) setMessages(updated.messages);
        }
        return list;
    }
    return [] as Convo[];
  };

  useEffect(() => {
    fetchConversations();
    const fetchProfiles = async () => {
        const userId = await getAuthedUserId();
        if (!userId) return;
        const { data, error } = await supabase.from('profiles').select('id, full_name, user_type, image_url, role').neq('id', userId);
        if (error) setContactLoadError(`Contacts could not be loaded: ${error.message}`);
        else if (data) { setAllProfiles(data); setContactLoadError(''); }
    };
    fetchProfiles();
    const channel = supabase.channel(`msgs_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
            fetchConversations();
        });
    
    channel.subscribe();
    const onWake = () => { fetchConversations(); fetchProfiles(); };
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, []);

    useEffect(() => {
        if (!initialRecipient) return;
        let cancelled = false;

        const openRecipientConversation = async () => {
            const loadedConversations = await fetchConversations();
            if (cancelled) return;

            const existing = loadedConversations.find(conversation => conversation.id === initialRecipient.id);
            const conversation = existing || {
                id: initialRecipient.id,
                participant: {
                    name: initialRecipient.name,
                    imageUrl: initialRecipient.imageUrl,
                    userType: 'professional',
                    requiresConsultation: initialRecipient.requiresConsultation,
                },
                messages: []
            };

            if (!existing) {
                setConversations(current => [conversation, ...current.filter(item => item.id !== conversation.id)]);
            }
            await openConversation(conversation);
            onInitialRecipientHandled?.();
        };

        openRecipientConversation();
        return () => { cancelled = true; };
    }, [initialRecipient?.id]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selectedConvo]);
  
  const startNewConversation = async (profile: any) => {
      const userId = await getAuthedUserId();
      if (!userId) return;

      const existing = conversations.find(c => c.id === profile.id);
      const conversation: Convo = existing || {
          id: profile.id,
          participant: {
              name: profile.full_name,
              imageUrl: profile.image_url || '',
              userType: profile.user_type,
              requiresConsultation: isProfessionalProfile(profile),
          },
          messages: []
      };
      if (!existing) setConversations(prev => [conversation, ...prev]);
      await openConversation(conversation);
      setShowUserList(false);
  };

  const openConversation = async (conversation: Convo) => {
      setSelectedConvo(conversation);
      setMessages(conversation.messages);
      setIsGated(true);
      setIsCheckingAccess(true);
      setAccessError('');

      const userId = await getAuthedUserId();
      if (!userId) {
          setAccessError('Please sign in again to verify your messaging access.');
          setIsCheckingAccess(false);
          return;
      }

      const { data: allowed, error: profileError } = await supabase.rpc('can_message_participants', {
          message_sender: userId,
          message_receiver: conversation.id,
      });

      if (profileError) {
          console.error('Could not verify messaging access:', profileError);
          setAccessError(`We could not verify messaging access: ${profileError.message}`);
          addNotification('Messaging unavailable', `We could not verify messaging access: ${profileError.message}`, 'error');
          setIsCheckingAccess(false);
          return;
      }

      setIsGated(allowed !== true);
      setIsCheckingAccess(false);
  };

  useEffect(() => {
    if (!selectedConvo) return;
    const recheck = () => { void openConversation(selectedConvo); };
    const channel = supabase.channel(`chat_payment_access_${selectedConvo.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, recheck)
      .subscribe();
    window.addEventListener('focus', recheck);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', recheck);
    };
  }, [selectedConvo?.id]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedConvo || isGated || isCheckingAccess || accessError) return;
    const userId = await getAuthedUserId();
    if (!userId) return;

    const { error } = await supabase.from('messages').insert([{
        sender_id: userId,
        receiver_id: selectedConvo.id,
        content: inputText
    }]);

    if (!error) {
        setInputText('');
        fetchConversations();
    } else {
        console.error('Message could not be sent:', error);
        addNotification('Message not sent', error.code === '42501'
          ? 'Messaging permission was denied. A successful consultation payment for this professional is required.'
          : `Your message could not be saved: ${error.message}`, 'error');
    }
  };

  const ConversationList = () => (
    <div className={`flex flex-col h-full ${isMobileView && selectedConvo ? 'hidden' : 'w-full md:w-1/3 border-r border-slate-200'}`}>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Messages</h1>
            <button onClick={() => setShowUserList(!showUserList)} className="p-2 bg-sky-600 text-white rounded-full shadow-lg active:scale-95 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-white">
            {contactLoadError && <p className="p-4 text-sm text-red-600">{contactLoadError}</p>}
            {conversations.length === 0 && (
                <div className="p-8 text-center">
                    <p className="text-slate-400 font-bold text-sm">No active chats.</p>
                    <button onClick={() => setShowUserList(true)} className="text-sky-600 text-xs font-black mt-2 uppercase tracking-widest">Start Messaging</button>
                </div>
            )}
            {conversations.map(convo => (
                <div 
                    key={convo.id} 
                    onClick={() => { void openConversation(convo); }}
                    className={`flex items-center p-4 cursor-pointer border-b border-slate-50 transition-colors ${selectedConvo?.id === convo.id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                >
                    <div className="relative">
                        {convo.participant.imageUrl ? (
                            <img src={convo.participant.imageUrl} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"/>
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center text-sky-600 font-black text-sm border-2 border-white shadow-sm">
                                {getInitials(convo.participant.name)}
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 overflow-hidden ml-4">
                        <h3 className="font-bold text-slate-800 truncate">{convo.participant.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{convo.messages[convo.messages.length-1]?.text || 'No messages yet'}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="container mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8">
        <div className="bg-slate-50 md:bg-white md:rounded-2xl md:shadow-xl h-[100vh] md:h-[80vh] flex overflow-hidden relative">
            
            <ConversationList />

            {/* User Selection Overlay */}
            {showUserList && (
                <div className="absolute inset-0 bg-white z-50 flex flex-col animate-fade-in">
                    <header className="p-4 border-b border-slate-200 flex items-center gap-4">
                        <button onClick={() => setShowUserList(false)} className="p-2 text-slate-400 hover:text-slate-800 transition-colors"><ChevronLeftIcon className="w-6 h-6" /></button>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">New Message</h2>
                    </header>
                    <div className="flex-1 overflow-y-auto">
                        {contactLoadError && <p className="p-4 text-sm text-red-600">{contactLoadError}</p>}
                        {!contactLoadError && allProfiles.length === 0 && <p className="p-4 text-sm text-slate-500">No contacts are available. Try opening Message from the professional you paid for.</p>}
                        {allProfiles.map(p => (
                            <div key={p.id} onClick={() => startNewConversation(p)} className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 flex items-center gap-4 transition-colors">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-black text-xs">
                                    {getInitials(p.full_name)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{p.full_name}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.user_type}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className={`flex flex-col h-full bg-white ${isMobileView && !selectedConvo ? 'hidden' : 'flex-1'}`}>
                {selectedConvo ? (
                    isGated ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                            <button onClick={() => setSelectedConvo(null)} className="mb-4 text-sky-700 font-bold text-sm">Back to contacts</button>
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-slate-100">
                                <CreditCardIcon className="h-10 w-10 text-slate-300" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">
                                {isCheckingAccess
                                  ? 'Checking access'
                                  : accessError
                                    ? 'Unable to verify access'
                                    : 'Consultation Required'}
                            </h2>
                            <p className="text-slate-500 max-w-sm mb-8 font-medium">
                                {isCheckingAccess
                                  ? 'Please wait while we verify your consultation.'
                                  : accessError
                                    ? accessError
                                    : `Messaging with ${selectedConvo.participant.name} is available after you have paid for a consultation with this professional.`}
                            </p>
                            <button 
                                onClick={() => accessError ? void openConversation(selectedConvo) : setActiveSection('Doctors')}
                                disabled={isCheckingAccess}
                                className="px-8 py-3 bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                {isCheckingAccess ? 'Please wait' : accessError ? 'Try Again' : 'Book Consultation'}
                            </button>
                        </div>
                    ) : (
                    <>
                        <header className="p-3 sm:p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                {isMobileView && (
                                    <button onClick={() => setSelectedConvo(null)} className="p-1 text-slate-400 hover:text-slate-800 transition-colors"><ChevronLeftIcon className="w-6 h-6" /></button>
                                )}
                                {selectedConvo.participant.imageUrl ? (
                                    <img src={selectedConvo.participant.imageUrl} className="w-10 h-10 rounded-full object-cover shadow-sm"/>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-black text-xs shadow-sm">
                                        {getInitials(selectedConvo.participant.name)}
                                    </div>
                                )}
                                <div>
                                    <h2 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">{selectedConvo.participant.name}</h2>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-3">
                                <button onClick={() => onStartVideoCall({ ...selectedConvo.participant, peerId: selectedConvo.id })} className="p-2 text-slate-400 hover:text-sky-600 transition-all"><PhoneIcon className="h-5 w-5" /></button>
                                <button onClick={() => onStartVideoCall({ ...selectedConvo.participant, peerId: selectedConvo.id })} className="p-2 text-sky-600 bg-sky-50 rounded-full transition-all"><VideoCameraIcon className="h-5 w-5" /></button>
                            </div>
                        </header>

                        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#F8FAFC]">
                             {messages.length === 0 && (
                                 <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                     <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4"><SendIcon className="w-6 h-6 text-slate-300" /></div>
                                     <p className="text-slate-400 text-sm font-medium">This is the beginning of your conversation with {selectedConvo.participant.name}.</p>
                                 </div>
                             )}
                             {messages.map((msg, index) => (
                                <div key={index} className={`flex flex-col mb-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-md shadow-sm text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-sky-600 text-white rounded-br-none' 
                                            : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                                    }`}>
                                        <p className="leading-relaxed">{msg.text}</p>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{msg.timestamp}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
                             <div className="flex items-center gap-2 max-w-4xl mx-auto">
                                <input 
                                    type="text" 
                                    placeholder="Write a message..." 
                                    className="flex-1 p-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 text-sm" 
                                    value={inputText} 
                                    onChange={(e) => setInputText(e.target.value)} 
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
                                />
                                <button 
                                    onClick={handleSendMessage} 
                                    disabled={!inputText.trim()}
                                    className="p-3.5 bg-sky-600 text-white rounded-2xl shadow-lg shadow-sky-100 hover:bg-sky-700 transition disabled:opacity-50 active:scale-95"
                                >
                                    <SendIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </>
                    )
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-slate-300 bg-slate-50">
                        <svg className="w-20 h-20 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <p className="font-black uppercase tracking-widest text-xs">Select a contact to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Messaging;
