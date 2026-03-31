import * as cheerio from 'cheerio';
import { PDFParse } from 'pdf-parse';
import { upsertReport, logEvent } from '@/lib/db/queries';

const GAO_RSS_URL = 'https://www.gao.gov/rss/reports.xml';
// Pages 1-3 only to stay within function timeout budget
const PDF_PARTIAL_PAGES = [1, 2, 3];

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

async function extractGaoText(url: string): Promise<{ text: string; contentType: 'html' | 'pdf' }> {
  const pageRes = await fetch(url, { headers: { 'User-Agent': 'signal-engine/1.0' } });
  if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status} fetching ${url}`);
  const html = await pageRes.text();
  const $ = cheerio.load(html);

  // Try to find a PDF link on the page
  const pdfHref = $('a[href$=".pdf"]').first().attr('href');
  if (pdfHref) {
    const pdfUrl = pdfHref.startsWith('http') ? pdfHref : `https://www.gao.gov${pdfHref}`;
    const parser = new PDFParse({ url: pdfUrl });
    try {
      const result = await parser.getText({ partial: PDF_PARTIAL_PAGES });
      return { text: result.text, contentType: 'pdf' };
    } catch {
      // Fall through to HTML summary
    } finally {
      await parser.destroy();
    }
  }

  // Fallback: HTML summary text
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
