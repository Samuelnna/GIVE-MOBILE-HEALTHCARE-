
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from '../types';
import { ChatIcon, CloseIcon, SendIcon, UserCircleIcon, BotIcon } from './IconComponents';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const aiRef = useRef<GoogleGenerativeAI | null>(null);
  
  const getAI = (): GoogleGenerativeAI | null => {
    if (!aiRef.current) {
      try {
        const apiKey = (process.env.NEXT_PUBLIC_GEMINI_API_KEY as string) || (process.env.NEXT_PUBLIC_API_KEY as string) || '';
        if (apiKey) {
            aiRef.current = new GoogleGenerativeAI(apiKey);
        }
      } catch (err) {
        console.error('AI initialization failed:', err);
        return null;
      }
    }
    return aiRef.current;
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'model',
        text: "Hello! I'm the Mobile Health AI assistant. How can I help you find a doctor, hospital, or service today?"
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    const aiInstance = getAI();
    if (!aiInstance) {
      const errorMessage: ChatMessage = { role: 'model', text: "AI service is not available. Please check your API key configuration." };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      return;
    }

    try {
      const model = aiInstance.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        systemInstruction: "You are a friendly AI assistant for a telemedicine platform called Mobile Health. Your goal is to help users navigate the platform. You can help them find hospitals, doctors, lab tests, and pharmacy items. Keep your responses concise and helpful. Guide them to the correct sections of the app.",
      });

      const result = await model.generateContent(`Previous messages: ${JSON.stringify(messages)}. User message: ${currentInput}`);
      const modelMessage: ChatMessage = { role: 'model', text: result.response.text() || '' };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      let text = "Sorry, I'm having trouble connecting. Please try again later.";
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        text = "The AI service is currently at its limit (quota exceeded). Please wait a moment before trying again.";
      }
      const errorMessage: ChatMessage = { role: 'model', text };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
      <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && <BotIcon className="w-8 h-8 text-sky-500 flex-shrink-0" />}
        <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-md ${isUser ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
          <p className="text-sm">{message.text}</p>
        </div>
         {isUser && <UserCircleIcon className="w-8 h-8 text-slate-400 flex-shrink-0" />}
      </div>
    );
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-sky-600 text-white p-4 rounded-full shadow-lg hover:bg-sky-700 transition-transform transform hover:scale-110"
        aria-label="Open chat"
      >
        <ChatIcon className="h-8 w-8" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-sm h-[70vh] max-h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
      <header className="bg-sky-600 text-white p-4 flex justify-between items-center rounded-t-lg">
        <h3 className="font-bold text-lg">Mobile Health Assistant</h3>
        <button onClick={() => setIsOpen(false)} aria-label="Close chat">
          <CloseIcon className="h-6 w-6" />
        </button>
      </header>
      
      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
        {isLoading && (
            <div className="flex justify-start gap-3 my-4">
                <BotIcon className="w-8 h-8 text-sky-500 flex-shrink-0" />
                <div className="px-4 py-3 bg-slate-200 rounded-2xl rounded-bl-none flex items-center gap-2">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-300"></span>
                </div>
            </div>
        )}
      </div>

      <footer className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white text-slate-800"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-sky-600 text-white rounded-lg disabled:bg-slate-400 hover:bg-sky-700 transition"
            aria-label="Send message"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Chatbot;
