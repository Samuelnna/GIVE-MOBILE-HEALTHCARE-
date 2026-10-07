import { XMLParser } from 'fast-xml-parser';
import { NextResponse } from 'next/server';

export const revalidate = 900;

const WHO_NEWS_FEED = 'https://www.afro.who.int/rss.xml';
const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

interface RssItem {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  description?: string;
  'a10:updated'?: string;
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stripMarkup(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  try {
    const response = await fetch(WHO_NEWS_FEED, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`WHO RSS returned HTTP ${response.status}`);
    }

    const xml = await response.text();
    const feed = parser.parse(xml);
    const items = feed?.rss?.channel?.item;
    const normalizedItems: RssItem[] = Array.isArray(items) ? items : items ? [items] : [];

    const articles = normalizedItems
      .map((item) => {
        const title = stripMarkup(text(item.title));
        const url = text(item.link) || text(item.guid);
        const publishedAt = text(item.pubDate) || text(item['a10:updated']);
        const summary = stripMarkup(text(item.description));

        if (!title || !url) return null;
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('who.int')) return null;
        } catch {
          return null;
        }

        return {
          title,
          url,
          publishedAt: Number.isNaN(Date.parse(publishedAt)) ? null : publishedAt,
          summary: summary.slice(0, 360),
          source: 'WHO Regional Office for Africa',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 8);

    return NextResponse.json(
      { articles, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } }
    );
  } catch (error) {
    console.error('Health news feed request failed:', error);
    return NextResponse.json(
      { error: 'Latest health news is temporarily unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
