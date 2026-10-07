'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LightBulbIcon, SearchIcon } from '../components/IconComponents';
import HealthTopicDetail from '../components/HealthTopicDetail';
import { supabase } from '../src/supabaseClient';
import LatestHealthNews from '../components/LatestHealthNews';

interface HealthArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  author_name?: string | null;
  image_url?: string | null;
  published_at?: string | null;
}

function getReadTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function getExcerpt(content: string) {
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

export default function HealthArticles() {
  const [articles, setArticles] = useState<HealthArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HealthArticle | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All topics');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadArticles = async () => {
      setIsLoading(true);
      setError('');
      const { data, error: queryError } = await supabase
        .from('health_topics')
        .select('*')
        .order('published_at', { ascending: false });

      if (cancelled) return;
      if (queryError) {
        console.error('Health articles could not be loaded:', queryError);
        setError('We could not load health articles. Please try again.');
      } else {
        setArticles((data || []) as HealthArticle[]);
      }
      setIsLoading(false);
    };

    loadArticles();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const categories = useMemo(
    () => ['All topics', ...new Set(articles.map((article) => article.category).filter(Boolean))],
    [articles]
  );

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesCategory = category === 'All topics' || article.category === category;
      const matchesSearch = !query || `${article.title} ${article.category} ${article.content}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [articles, category, search]);

  return (
    <section className="mx-auto min-h-[70vh] max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-700 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-12">
        <div className="flex items-start gap-4">
          <span className="rounded-2xl bg-white/10 p-3 text-emerald-200">
            <LightBulbIcon className="h-8 w-8" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">MobileDoc health library</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Health news & articles</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-emerald-50/85">
              Keep up with trusted health updates, then explore practical health and wellness reading from MobileDoc.
            </p>
          </div>
        </div>
      </header>

      <LatestHealthNews />

      <section aria-labelledby="mobile-articles-heading" className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">From the MobileDoc library</p>
            <h2 id="mobile-articles-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-950">Health articles</h2>
            <p className="mt-1 text-sm text-slate-500">Practical reads from our health and wellness collection.</p>
          </div>
          <p className="text-sm font-semibold text-slate-400">{filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}</p>
        </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block">
          <span className="sr-only">Search health articles</span>
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search articles or topics..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </label>
        <label>
          <span className="sr-only">Filter by topic</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3.5 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading articles">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-10 text-center" role="alert">
          <p className="font-semibold text-rose-800">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800"
          >
            Try again
          </button>
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setSelectedArticle(article)}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
            >
              {article.image_url ? (
                <img src={article.image_url} alt="" className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              ) : (
                <div className="flex h-52 items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-700">
                  <LightBulbIcon className="h-14 w-14" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">{article.category}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">{getReadTime(article.content)} min read</span>
                </div>
                <h2 className="mt-4 text-xl font-black leading-snug text-slate-900 transition group-hover:text-emerald-800">{article.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{getExcerpt(article.content)}{article.content.length > 150 ? '…' : ''}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400">
                  <span>{article.author_name || 'MobileDoc Health Team'}</span>
                  {article.published_at && <time dateTime={article.published_at}>{new Date(article.published_at).toLocaleDateString()}</time>}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <LightBulbIcon className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-slate-700">{articles.length ? 'No articles match your search' : 'No articles published yet'}</h2>
          <p className="mt-2 text-sm text-slate-500">{articles.length ? 'Try another search term or topic.' : 'Check back soon for health and wellness reading.'}</p>
        </div>
      )}

      {selectedArticle && (
        <HealthTopicDetail topic={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
      </section>
    </section>
  );
}
