import React, { useState, useEffect } from 'react';
import type { HealthTopic } from '../types';
import { supabase } from '../src/supabaseClient';
import { LightBulbIcon } from './IconComponents';
import HealthTopicDetail from './HealthTopicDetail';

const TopicCard: React.FC<{ topic: any; onClick: () => void }> = ({ topic, onClick }) => (
    <div 
        onClick={onClick}
        className="flex-shrink-0 w-72 lg:w-auto bg-white rounded-lg shadow-md overflow-hidden snap-start group cursor-pointer transform hover:-translate-y-1 transition-all duration-300"
    >
        <div className="h-40 overflow-hidden">
            <img src={topic.image_url || topic.imageUrl} alt={topic.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="p-4">
            <p className="text-xs font-semibold text-sky-600 uppercase">{topic.category}</p>
            <h4 className="font-bold text-slate-800 mt-1 truncate group-hover:text-sky-700">{topic.title}</h4>
            <p className="text-sm text-slate-500 mt-2">{topic.readTime} min read</p>
        </div>
    </div>
);

const HealthTopics: React.FC = () => {
    const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
    const [topics, setTopics] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTopics = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('health_topics')
                    .select('*')
                    .order('published_at', { ascending: false });
                
                if (error) throw error;
                setTopics(data || []);
            } catch (err) {
                console.error('Error fetching health topics:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTopics();
    }, []);

  return (
    <>
    <div className="bg-slate-100 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
                <LightBulbIcon className="h-8 w-8 text-amber-500" />
                <h2 className="text-3xl font-bold text-slate-800">Health & Wellness Topics</h2>
            </div>
            <div className="flex gap-6 pb-4 overflow-x-auto snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible">
                {isLoading ? (
                    [1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-lg"></div>)
                ) : topics.length > 0 ? (
                    topics.map(topic => (
                        <TopicCard key={topic.id} topic={topic} onClick={() => setSelectedTopic(topic)} />
                    ))
                ) : (
                    <div className="col-span-4 text-center py-12 text-slate-400">No health topics published yet.</div>
                )}
            </div>
        </div>
    </div>
    {selectedTopic && (
        <HealthTopicDetail 
            topic={selectedTopic}
            onClose={() => setSelectedTopic(null)}
        />
    )}
    </>
  );
};

export default HealthTopics;