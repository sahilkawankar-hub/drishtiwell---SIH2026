/**
 * Simple PDF Generator Utility
 * 
 * Generates valid standard PDF-1.4 documents containing selectable text streams.
 * Used for creating realistic demo drilling reports for testing without heavy external dependencies.
 */

export interface SimplePdfOptions {
  title: string;
  lines: string[];
}

export function createSimplePdf(options: SimplePdfOptions): Buffer {
  const { title, lines } = options;

  let streamContent = 'BT\n';
  // Title (Bold-like larger text)
  streamContent += '/F1 14 Tf\n50 760 Td\n18 TL\n';
  const cleanTitle = escapePdfText(title);
  streamContent += `(${cleanTitle}) Tj\nT*\n`;

  // Body text
  streamContent += '/F1 10 Tf\n14 TL\n';
  for (const line of lines) {
    if (!line.trim()) {
      streamContent += 'T*\n';
      continue;
    }
    const cleanLine = escapePdfText(line);
    streamContent += `(${cleanLine}) Tj\nT*\n`;
  }
  streamContent += 'ET';

  const streamLength = Buffer.byteLength(streamContent, 'utf-8');
  const streamObj = `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`;

  const obj1 = '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj';
  const obj2 = '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj';
  const obj3 = '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj';
  const obj4 = `4 0 obj ${streamObj} endobj`;
  const obj5 = '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj';

  const header = '%PDF-1.4\n';
  let body = '';
  const offsets: number[] = [0];

  const objects = [obj1, obj2, obj3, obj4, obj5];
  let currentOffset = Buffer.byteLength(header, 'utf-8');

  for (const obj of objects) {
    offsets.push(currentOffset);
    const objStr = obj + '\n';
    body += objStr;
    currentOffset += Buffer.byteLength(objStr, 'utf-8');
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer, 'utf-8');
}

function escapePdfText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
