'use client';

import React, { useEffect, useState } from 'react';

interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  source: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  updatedAt: string;
}

export default function LatestHealthNews() {
  const [feed, setFeed] = useState<NewsResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadNews = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('/api/health-news', { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'News feed could not be loaded.');
        setFeed(result as NewsResponse);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Latest health news could not be loaded:', loadError);
        setError('The latest headlines are temporarily unavailable.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadNews();
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReloadKey((key) => key + 1);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section aria-labelledby="latest-health-news-heading" className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h8.25L19.5 9v11.25A1.75 1.75 0 0 1 17.75 22h-10A1.75 1.75 0 0 1 6 20.25V3.75Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v5h5M9 13h7m-7 3.5h7" />
            </svg>
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="latest-health-news-heading" className="text-lg font-black text-slate-950">Latest health news</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
                WHO Africa
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">Health updates from the WHO African Region. Opens at the original source.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:justify-end">
          {feed?.updatedAt && (
            <p className="shrink-0 text-[11px] font-medium text-slate-400">
              Updated {new Date(feed.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={isLoading}
            aria-label="Refresh health news"
            title="Refresh headlines"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6.5V3m0 3.5H13M16.2 6.3A6.5 6.5 0 1 0 17 11" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3" aria-label="Loading health news">
          {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p role="alert" className="text-sm font-semibold text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            Try again
          </button>
        </div>
      ) : feed?.articles.length ? (
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {feed.articles.slice(0, 6).map((article) => (
            <article key={article.url} className="flex min-h-40 flex-col rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{article.source}</span>
                {article.publishedAt && (
                  <time dateTime={article.publishedAt} className="shrink-0 text-[11px] font-medium text-slate-400">
                    {new Date(article.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </time>
                )}
              </div>
              <h3 className="mt-3 line-clamp-3 text-base font-extrabold leading-snug text-slate-900">{article.title}</h3>
              {article.summary && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{article.summary}</p>}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-emerald-800 hover:text-emerald-950 focus:outline-none focus:underline"
              >
                Read at WHO Africa
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.5h5.5V9M16.25 3.75l-7 7M15 10.5v4.25A1.25 1.25 0 0 1 13.75 16h-8.5A1.25 1.25 0 0 1 4 14.75v-8.5A1.25 1.25 0 0 1 5.25 5H9.5" />
                </svg>
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-7">No recent headlines are available right now.</p>
      )}

      <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-relaxed text-slate-400 sm:px-6">
        Feed refreshes automatically every 15 minutes while this page is open. Headlines link to WHO and are for general information, not medical advice.
      </p>
    </section>
  );
}
