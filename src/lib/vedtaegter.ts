export const VEDTAEGTER_DOC_ID = '11IsOyvlWYbBFIU326RptxM6PZVE7ZuhQi3X7bZbepok';
export const VEDTAEGTER_EXPORT_URL = `https://docs.google.com/document/d/${VEDTAEGTER_DOC_ID}/export?format=txt`;
export const VEDTAEGTER_SOURCE_URL = `https://docs.google.com/document/d/${VEDTAEGTER_DOC_ID}/edit?usp=sharing`;

export type VedtaegterSection = {
  heading: string;
  body: string;
};

export type VedtaegterDoc = {
  title: string;
  meta: string[];
  sections: VedtaegterSection[];
  closing: string[];
};

function normalizeWhitespace(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanBlock(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/^[ \t]+/, '').replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseVedtaegterText(raw: string): VedtaegterDoc {
  const text = normalizeWhitespace(raw);
  const sectionMatches = [...text.matchAll(/^§\d+\.[^\n]*/gm)];

  if (sectionMatches.length === 0) {
    return {
      title: 'Vedtægter',
      meta: [],
      sections: [{ heading: 'Dokument', body: text }],
      closing: [],
    };
  }

  const firstSectionIndex = sectionMatches[0].index ?? 0;
  const preamble = text.slice(0, firstSectionIndex).trim();
  const preambleLines = preamble.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = preambleLines[0] ?? 'Vedtægter';
  const meta = preambleLines.slice(1);

  const sections: VedtaegterSection[] = [];
  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const start = match.index ?? 0;
    const end = sectionMatches[i + 1]?.index ?? text.length;
    const chunk = text.slice(start, end).trim();
    const newline = chunk.indexOf('\n');
    const heading = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
    const body = cleanBlock(newline === -1 ? '' : chunk.slice(newline + 1));
    sections.push({ heading, body });
  }

  const last = sectionMatches[sectionMatches.length - 1];
  const lastStart = last.index ?? 0;
  const lastChunk = text.slice(lastStart);
  const nextNonSection = lastChunk.search(/\n_{3,}\n|\nUnderskrifter\b/);
  let closing: string[] = [];
  if (nextNonSection !== -1) {
    const absolute = lastStart + nextNonSection;
    const closingText = cleanBlock(text.slice(absolute).replace(/^_+\n*/, ''));
    closing = closingText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !/^_+$/.test(line));
    const lastBodyEnd = text.slice(lastStart).search(/\n_{3,}\n|\nUnderskrifter\b/);
    if (lastBodyEnd !== -1) {
      const headingLine = sections[sections.length - 1].heading;
      const bodyOnly = cleanBlock(
        text.slice(lastStart + headingLine.length, lastStart + lastBodyEnd),
      );
      sections[sections.length - 1] = { heading: headingLine, body: bodyOnly };
    }
  }

  return { title, meta, sections, closing };
}

export async function getVedtaegter(): Promise<VedtaegterDoc | null> {
  try {
    const response = await fetch(VEDTAEGTER_EXPORT_URL, {
      next: { revalidate: 3600 },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const raw = await response.text();
    if (!raw.trim() || raw.includes('<!DOCTYPE html>') || raw.includes('<html')) {
      return null;
    }
    return parseVedtaegterText(raw);
  } catch (error) {
    console.error('Fejl ved hentning af vedtægter:', error);
    return null;
  }
}
