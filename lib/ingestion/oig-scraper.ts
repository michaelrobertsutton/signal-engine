import * as cheerio from 'cheerio';
import { PDFParse } from 'pdf-parse';
import { upsertReport, logEvent } from '@/lib/db/queries';

const OIG_BASE = 'https://oig.hhs.gov';
const OIG_REPORTS_PATH = '/reports/all/';

const TEXT_RATIO_MIN = 0.70;
const TEXT_RATIO_MAX = 1.30;

interface ReportLink {
  url: string;
  title: string;
}

async function extractText(url: string): Promise<{ text: string; contentType: 'html' | 'pdf' }> {
  if (url.toLowerCase().endsWith('.pdf')) {
    const parser = new PDFParse({ url });
    try {
      const result = await parser.getText();
      return { text: result.text, contentType: 'pdf' };
    } finally {
      await parser.destroy();
    }
  }

  const res = await fetch(url, { headers: { 'User-Agent': 'signal-engine/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $('nav, footer, script, style, header').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return { text, contentType: 'html' };
}

export async function scrapeOigReports(): Promise<number> {
  let html: string;
  try {
    const res = await fetch(`${OIG_BASE}${OIG_REPORTS_PATH}`, {
      headers: { 'User-Agent': 'signal-engine/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    await logEvent('oig_fetch_error', { error: String(err) }, 'oig');
    throw err;
  }

  const $ = cheerio.load(html);
  const links: ReportLink[] = [];

  // Report links match /reports/all/YEAR/slug/ pattern
  $('a[href*="/reports/all/20"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || !href) return;
    const url = href.startsWith('http') ? href : `${OIG_BASE}${href}`;
    if (!links.some((l) => l.url === url)) links.push({ url, title });
  });

  if (links.length === 0) {
    await logEvent(
      'scraper_alert',
      { message: 'OIG listing returned 0 report links — possible structure change' },
      'oig',
    );
    return 0;
  }

  let count = 0;
  for (const link of links.slice(0, 20)) {
    try {
      const { text, contentType } = await extractText(link.url);
      await upsertReport({
        source: 'oig',
        reportUrl: link.url,
        title: link.title,
        content: text || null,
        contentType,
        status: 'fetched',
      });
      count++;
    } catch (err) {
      await logEvent('oig_report_error', { url: link.url, error: String(err) }, 'oig');
      await upsertReport({
        source: 'oig',
        reportUrl: link.url,
        title: link.title,
        content: null,
        status: 'failed',
      });
    }
  }

  // Text length ratio health check
  if (links.length > 0) {
    const ratio = count / links.slice(0, 20).length;
    if (ratio < TEXT_RATIO_MIN || ratio > TEXT_RATIO_MAX) {
      await logEvent(
        'scraper_alert',
        { message: `OIG success ratio out of bounds: ${ratio.toFixed(2)}`, count, expected: links.slice(0, 20).length },
        'oig',
      );
    }
  }

  return count;
}
