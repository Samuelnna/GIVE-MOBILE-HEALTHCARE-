import React, { useEffect, useState } from 'react';
import type { HealthTopic } from '../types';
import { supabase } from '../src/supabaseClient';
import { LightBulbIcon } from './IconComponents';
import HealthTopicDetail from './HealthTopicDetail';

type Topic = Omit<HealthTopic, 'id' | 'imageUrl' | 'readTime'> & {
  id: number | string;
  title: string;
  category?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  content?: string | null;
  readTime?: number;
}

function getReadTime(topic: Topic) {
  if (topic.readTime) return topic.readTime;
  const words = topic.content?.trim().split(/\s+/).filter(Boolean).length || 0;
  return Math.max(1, Math.ceil(words / 200));
}

function getExcerpt(content?: string | null) {
  if (!content) return 'Helpful information and practical guidance for your health and wellbeing.';
  const excerpt = content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return excerpt.length > 110 ? `${excerpt.slice(0, 110).trimEnd()}…` : excerpt;
}

const HealthTopics: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('health_topics')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(4);

        if (error) throw error;
        setTopics((data || []) as Topic[]);
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
      <section aria-labelledby="health-wellness-heading" className="relative overflow-hidden border-y border-emerald-100 bg-gradient-to-b from-emerald-50/70 via-white to-white py-14 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">The MobileDoc library</p>
              <h2 id="health-wellness-heading" className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Health &amp; Wellness Topics
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Clear, practical reads to help you make informed choices and take good care of yourself.
              </p>
            </div>
            <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm">
              <LightBulbIcon className="h-5 w-5 text-amber-500" />
              <span>Worth a few minutes</span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading health topics">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-80 animate-pulse rounded-3xl border border-slate-100 bg-white" />
              ))}
            </div>
          ) : topics.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {topics.map((topic) => {
                const image = topic.image_url || topic.imageUrl;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/5 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-50">
                      {image ? (
                        <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-emerald-700">
                          <LightBulbIcon className="h-14 w-14" />
                        </div>
                      )}
                      <span className="absolute left-4 top-4 max-w-[calc(100%-2rem)] truncate rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 shadow-sm">
                        {topic.category || 'Wellness'}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-black leading-snug text-slate-900 transition group-hover:text-emerald-800">{topic.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{getExcerpt(topic.content)}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs font-semibold text-slate-500">{getReadTime(topic)} min read</span>
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                          Read topic
                          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-emerald-200 bg-white/80 px-6 py-12 text-center">
              <LightBulbIcon className="mx-auto h-10 w-10 text-emerald-300" />
              <p className="mt-3 font-bold text-slate-700">New health topics are on the way.</p>
              <p className="mt-1 text-sm text-slate-500">Check back soon for practical health and wellness reads.</p>
            </div>
          )}
        </div>
      </section>
      {selectedTopic && (
        <HealthTopicDetail topic={selectedTopic} onClose={() => setSelectedTopic(null)} />
      )}
    </>
  );
};

export default HealthTopics;
