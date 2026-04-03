import * as cheerio from 'cheerio';
import { upsertReport, logEvent } from '@/lib/db/queries';

const GAO_RSS_URL = 'https://www.gao.gov/rss/reports.xml';

interface GaoEntry {
  url: string;
  title: string;
  date?: string;
}

async function parseRss(xml: string): Promise<GaoEntry[]> {
  const $ = cheerio.load(xml, { xmlMode: true });
  const entries: GaoEntry[] = [];
  $('item').each((_, el) => {
    const url = $(el).find('link').text().trim();
    const title = $(el).find('title').text().trim();
    const date = $(el).find('pubDate').text().trim();
    if (url && title) entries.push({ url, title, date });
  });
  return entries;
}

async function extractGaoText(url: string): Promise<{ text: string; contentType: 'html' }> {
  const pageRes = await fetch(url, { headers: { 'User-Agent': 'signal-engine/1.0' } });
  if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status} fetching ${url}`);
  const html = await pageRes.text();
  const $ = cheerio.load(html);

  $('nav, footer, script, style, header').remove();
  const text = $('main, article, .report-content, body')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  return { text, contentType: 'html' };
}

export async function scrapeGaoReports(): Promise<number> {
  let xml: string;
  try {
    const res = await fetch(GAO_RSS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching GAO RSS`);
    xml = await res.text();
  } catch (err) {
    await logEvent('gao_fetch_error', { error: String(err) }, 'gao');
    throw err;
  }

  const entries = await parseRss(xml);

  if (entries.length === 0) {
    await logEvent(
      'scraper_alert',
      { message: 'GAO RSS returned 0 entries — possible feed change' },
      'gao',
    );
    return 0;
  }

  let count = 0;
  for (const entry of entries.slice(0, 20)) {
    try {
      const { text, contentType } = await extractGaoText(entry.url);
      await upsertReport({
        source: 'gao',
        reportUrl: entry.url,
        title: entry.title,
        publishedDate: entry.date ? new Date(entry.date) : undefined,
        content: text || null,
        contentType,
        status: 'fetched',
      });
      count++;
    } catch (err) {
      await logEvent('gao_report_error', { url: entry.url, error: String(err) }, 'gao');
      await upsertReport({
        source: 'gao',
        reportUrl: entry.url,
        title: entry.title,
        content: null,
        status: 'failed',
      });
    }
  }

  return count;
}
