import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';

const SITEMAP_INDEX_URL = 'https://www.tuttocampo.it/Sitemap/Index2025_26.xml';
const REQUEST_INTERVAL_MS = 1500;
const USER_AGENT =
  'Mozilla/5.0 (compatible; TuttocampoTeamsExtractor/1.0; +https://www.tuttocampo.it/)';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'tuttocampo');
const RAW_CSV_PATH = path.join(OUTPUT_DIR, 'teams_raw.csv');
const UNIQUE_CSV_PATH = path.join(OUTPUT_DIR, 'teams_unique.csv');

type RawTeamRow = {
  originalName: string;
  url: string;
};

type CliOptions = {
  sitemapFile?: string;
};

type FetchResult = {
  text: string | null;
  status: number | null;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

let lastRequestTimestamp = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTimestamp;
  if (elapsed < REQUEST_INTERVAL_MS) {
    await sleep(REQUEST_INTERVAL_MS - elapsed);
  }

  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xml,text/xml;q=0.9,*/*;q=0.8',
    },
  });

  lastRequestTimestamp = Date.now();
  return response;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

async function fetchTextWithHandling(url: string): Promise<FetchResult> {
  try {
    const response = await rateLimitedFetch(url);

    if (response.status === 403) {
      console.warn(`[WARN] 403 Forbidden su: ${url}`);
      return { text: null, status: 403 };
    }

    if (!response.ok) {
      console.warn(`[WARN] HTTP ${response.status} su: ${url}`);
      return { text: null, status: response.status };
    }

    return { text: await response.text(), status: response.status };
  } catch (error) {
    console.warn(`[WARN] Errore rete su ${url}:`, error);
    return { text: null, status: null };
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg.startsWith('--sitemap-file=')) {
      const value = arg.split('=').slice(1).join('=').trim();
      if (value) {
        options.sitemapFile = value;
      }
    }
  }

  return options;
}

function extractSitemapUrlsFromXml(xmlText: string): string[] {
  const parsed = xmlParser.parse(xmlText);
  const sitemapNodes = asArray<{ loc?: string }>(parsed?.sitemapindex?.sitemap);
  return sitemapNodes
    .map((node) => node?.loc?.trim())
    .filter((loc): loc is string => Boolean(loc));
}

function extractPageUrlsFromSitemap(xmlText: string): string[] {
  const parsed = xmlParser.parse(xmlText);
  const urlNodes = asArray<{ loc?: string }>(parsed?.urlset?.url);
  return urlNodes
    .map((node) => node?.loc?.trim())
    .filter((loc): loc is string => Boolean(loc));
}

function isLikelyTeamUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.includes('tuttocampo.it')) return false;

  const includePatterns = [
    '/squadra/',
    '/team/',
    '/societa/',
    '/campionato/',
    '/juniores',
    '/under-',
    '/allievi',
    '/giovanissimi',
    '/esordienti',
    '/pulcini',
    '/primi-calci',
    '/serie-d',
    '/eccellenza',
    '/promozione',
    '/prima-categoria',
    '/seconda-categoria',
    '/terza-categoria',
  ];

  return includePatterns.some((pattern) => lower.includes(pattern));
}

function extractTeamNameFromHtml(html: string): string | null {
  const $ = cheerio.load(html);

  const candidates = [
    $('meta[property="og:title"]').attr('content'),
    $('meta[name="title"]').attr('content'),
    $('title').first().text(),
    $('h1').first().text(),
  ];

  for (const candidate of candidates) {
    const cleaned = candidate?.replace(/\s+/g, ' ').trim();
    if (cleaned) return cleaned;
  }

  return null;
}

function normalizeTeamName(name: string): string {
  let normalized = name;

  const removalPatterns = [
    /\bunder\s*[- ]?2[1-9]\b/gi,
    /\bunder\s*[- ]?1[3-9]\b/gi,
    /\bunder\s*[- ]?1[0-2]\b/gi,
    /\bjuniores\b/gi,
    /\ballievi\b/gi,
    /\bgiovanissimi\b/gi,
    /\besordienti\b/gi,
    /\bpulcini\b/gi,
    /\bprimi\s+calci\b/gi,
    /\bserie\s*d\b/gi,
    /\beccellenza\b/gi,
    /\bpromozione\b/gi,
    /\bprima\s+categoria\b/gi,
    /\bseconda\s+categoria\b/gi,
    /\bterza\s+categoria\b/gi,
  ];

  for (const pattern of removalPatterns) {
    normalized = normalized.replace(pattern, ' ');
  }

  normalized = normalized
    .replace(/[|\-–—:,()[\]]/g, ' ')
    .replace(/\b(stagione|campionato|girone|classifica|calendario|risultati)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const options = parseCliOptions(process.argv.slice(2));

  let sitemapIndexXml: string | null = null;
  if (options.sitemapFile) {
    const sitemapPath = path.resolve(process.cwd(), options.sitemapFile);
    console.log(`[INFO] Lettura sitemap index da file locale: ${sitemapPath}`);
    sitemapIndexXml = await readFile(sitemapPath, 'utf8');
  } else {
    console.log(`[INFO] Download sitemap index: ${SITEMAP_INDEX_URL}`);
    const sitemapIndexResponse = await fetchTextWithHandling(SITEMAP_INDEX_URL);
    sitemapIndexXml = sitemapIndexResponse.text;
  }

  if (!sitemapIndexXml) {
    throw new Error('Impossibile ottenere la sitemap index iniziale.');
  }

  const childSitemapUrls = extractSitemapUrlsFromXml(sitemapIndexXml);
  console.log(`[INFO] Sitemap figlie trovate: ${childSitemapUrls.length}`);

  const candidateUrls = new Set<string>();
  let childSitemapsRead = 0;
  const blockedChildSitemaps: string[] = [];

  for (const sitemapUrl of childSitemapUrls) {
    const sitemapResponse = await fetchTextWithHandling(sitemapUrl);
    if (!sitemapResponse.text) {
      if (sitemapResponse.status === 403) {
        blockedChildSitemaps.push(sitemapUrl);
      }
      continue;
    }

    childSitemapsRead += 1;
    const urls = extractPageUrlsFromSitemap(sitemapResponse.text);
    for (const url of urls) {
      if (isLikelyTeamUrl(url)) {
        candidateUrls.add(url);
      }
    }
  }

  console.log(`[INFO] URL candidati dopo filtro: ${candidateUrls.size}`);

  const rawRows: RawTeamRow[] = [];

  for (const url of candidateUrls) {
    const pageResponse = await fetchTextWithHandling(url);
    if (!pageResponse.text) continue;

    const originalName = extractTeamNameFromHtml(pageResponse.text);
    if (!originalName) continue;

    rawRows.push({ originalName, url });
  }

  const deduped = new Map<string, string>();
  for (const row of rawRows) {
    const normalizedName = normalizeTeamName(row.originalName);
    if (!normalizedName) continue;

    const dedupeKey = normalizedName.toLocaleLowerCase('it-IT');
    if (!deduped.has(dedupeKey)) {
      deduped.set(dedupeKey, normalizedName);
    }
  }

  const uniqueTeams = Array.from(deduped.values()).sort((a, b) =>
    a.localeCompare(b, 'it-IT'),
  );

  const rawCsvLines = ['original_name,url'];
  for (const row of rawRows) {
    rawCsvLines.push(`${escapeCsv(row.originalName)},${escapeCsv(row.url)}`);
  }

  const uniqueCsvLines = ['team_name'];
  for (const teamName of uniqueTeams) {
    uniqueCsvLines.push(escapeCsv(teamName));
  }

  await writeFile(RAW_CSV_PATH, `${rawCsvLines.join('\n')}\n`, 'utf8');
  await writeFile(UNIQUE_CSV_PATH, `${uniqueCsvLines.join('\n')}\n`, 'utf8');

  if (blockedChildSitemaps.length > 0) {
    console.log('[WARN] Sitemap figlie bloccate (403):');
    for (const blockedSitemap of blockedChildSitemaps) {
      console.log(` - ${blockedSitemap}`);
    }
  }

  console.log('--- RISULTATO ---');
  console.log(`sitemap figlie trovate: ${childSitemapUrls.length}`);
  console.log(`sitemap figlie lette correttamente: ${childSitemapsRead}`);
  console.log(`sitemap figlie bloccate 403: ${blockedChildSitemaps.length}`);
  console.log(`URL candidati: ${candidateUrls.size}`);
  console.log(`squadre raw: ${rawRows.length}`);
  console.log(`squadre unique: ${uniqueTeams.length}`);
  console.log(`CSV raw: ${RAW_CSV_PATH}`);
  console.log(`CSV unique: ${UNIQUE_CSV_PATH}`);
}

main().catch((error) => {
  console.error('[ERROR] Estrazione fallita:', error);
  process.exitCode = 1;
});
