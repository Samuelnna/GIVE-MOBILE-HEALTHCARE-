import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { HealthTopic } from '../types';
import { CloseIcon, VideoCameraIcon } from './IconComponents';

interface HealthTopicDetailProps {
  topic: any;
  onClose: () => void;
}

interface GeneratedContent {
    article: string;
    videoScript: string;
}

// Helper to parse a single line for bold text
const parseText = (line: string) => {
    const parts = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return (
        <React.Fragment>
            {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**') ?
                <strong key={j} className="font-bold text-slate-700">{part.slice(2, -2)}</strong> :
                part
            )}
        </React.Fragment>
    );
};

const MarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
    const lines = markdown.split('\n');
    const components: React.ReactNode[] = [];
    let currentListItems: React.ReactNode[] = [];

    const flushList = () => {
        if (currentListItems.length > 0) {
            components.push(<ul key={`list-${components.length}`} className="list-disc pl-6 space-y-2 my-4">{currentListItems}</ul>);
            currentListItems = [];
        }
    };

    lines.forEach((line, i) => {
        if (line.startsWith('## ')) {
            flushList();
            components.push(<h2 key={i} className="text-2xl font-bold mt-6 mb-3 text-slate-800">{parseText(line.substring(3))}</h2>);
        } else if (line.startsWith('### ')) {
            flushList();
            components.push(<h3 key={i} className="text-xl font-semibold mt-4 mb-2 text-slate-700">{parseText(line.substring(4))}</h3>);
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            currentListItems.push(<li key={i}>{parseText(line.substring(2))}</li>);
        } else if (line.trim() !== '') {
            flushList();
            components.push(<p key={i} className="mb-4">{parseText(line)}</p>);
        } else {
            // It's a blank line, which can act as a separator.
            flushList();
        }
    });

    flushList(); // Add any remaining list items at the end

    return (
        <div className="prose max-w-none text-slate-600 leading-relaxed">
            {components}
        </div>
    );
};


const HealthTopicDetail: React.FC<HealthTopicDetailProps> = ({ topic, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // No longer fetching from Gemini, data is passed from topic prop
        setIsLoading(false);
    }, [topic]);
    
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-5 border-b border-slate-200 flex justify-between items-start gap-4">
                    <div>
                        <p className="text-sm font-semibold text-sky-600 uppercase">{topic.category}</p>
                        <h2 className="text-2xl font-bold text-slate-800">{topic.title}</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
                        aria-label="Close topic details"
                    >
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <main className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-96">
                            <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-500 font-semibold">Loading health guide...</p>
                        </div>
                    ) : (
                        <div>
                            {topic.image_url && (
                                <img src={topic.image_url} alt={topic.title} className="w-full h-64 object-cover rounded-xl mb-8 shadow-md" />
                            )}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                                    {topic.author_name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{topic.author_name}</p>
                                    <p className="text-xs text-slate-400">{new Date(topic.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>
                            <MarkdownRenderer markdown={topic.content} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default HealthTopicDetail;
