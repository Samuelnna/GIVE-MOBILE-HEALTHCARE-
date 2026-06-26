
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { SendIcon, PhoneIcon, VideoCameraIcon, ChevronLeftIcon } from '../components/IconComponents';
import { useNotification } from '../contexts/NotificationContext';

interface Convo {
    id: string;
    participant: { name: string; imageUrl: string };
    messages: any[];
}

const Messaging: React.FC<{ onStartVideoCall: (p: any) => void }> = ({ onStartVideoCall }) => {
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
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, image_url), receiver:profiles!messages_receiver_id_fkey(id, full_name, image_url)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
    
    if (data) {
        const groups: Record<string, Convo> = {};
        data.forEach(m => {
            const isMe = m.sender_id === user.id;
            const otherUser = isMe ? m.receiver : m.sender;
            if (!otherUser) return;
            if (!groups[otherUser.id]) {
                groups[otherUser.id] = {
                    id: otherUser.id,
                    participant: { name: (otherUser as any).full_name, imageUrl: (otherUser as any).image_url || '' },
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
    }
  };

  useEffect(() => {
    fetchConversations();
    const fetchProfiles = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('id, full_name, user_type, image_url').neq('id', user.id);
        if (data) setAllProfiles(data);
    };
    fetchProfiles();
    const channel = supabase.channel(`msgs_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
            fetchConversations();
        });
    
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selectedConvo]);
  
  const startNewConversation = (profile: any) => {
      const existing = conversations.find(c => c.id === profile.id);
      if (existing) {
          setSelectedConvo(existing);
          setMessages(existing.messages);
      } else {
          const newConvo: Convo = {
              id: profile.id,
              participant: { name: profile.full_name, imageUrl: profile.image_url || '' },
              messages: []
          };
          setConversations(prev => [newConvo, ...prev]);
          setSelectedConvo(newConvo);
          setMessages([]);
      }
      setShowUserList(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedConvo) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('messages').insert([{
        sender_id: user.id,
        receiver_id: selectedConvo.id,
        content: inputText
    }]);

    if (!error) {
        setInputText('');
        fetchConversations();
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
            {conversations.length === 0 && (
                <div className="p-8 text-center">
                    <p className="text-slate-400 font-bold text-sm">No active chats.</p>
                    <button onClick={() => setShowUserList(true)} className="text-sky-600 text-xs font-black mt-2 uppercase tracking-widest">Start Messaging</button>
                </div>
            )}
            {conversations.map(convo => (
                <div 
                    key={convo.id} 
                    onClick={() => { setSelectedConvo(convo); setMessages(convo.messages); }} 
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
                                <button onClick={() => onStartVideoCall(selectedConvo.participant)} className="p-2 text-slate-400 hover:text-sky-600 transition-all"><PhoneIcon className="h-5 w-5" /></button>
                                <button onClick={() => onStartVideoCall(selectedConvo.participant)} className="p-2 text-sky-600 bg-sky-50 rounded-full transition-all"><VideoCameraIcon className="h-5 w-5" /></button>
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
