/**
 * Document Processing Service Abstraction
 * 
 * Handles PDF/document upload, text extraction, and structured data extraction.
 * Replace DemoOCRProvider with real OCR/AI backend when ready.
 * 
 * Supported providers:
 *   - DemoOCRProvider (pattern-matching, no API required) — default
 *   - GoogleDocumentAIProvider (connect when GOOGLE_DOCUMENT_AI_KEY is set)
 *   - AWSTextractProvider (connect when AWS credentials are set)
 */

export interface ExtractionResult {
  rawText: string;
  confidence: number;
  extractedEvents: Array<{
    eventType: string;
    depth: number;
    description: string;
    severity: string;
  }>;
  extractedParameters: Array<{
    paramName: string;
    value: number;
    unit: string;
    depth: number;
  }>;
  extractedFormations: Array<{
    name: string;
    topDepth: number;
    bottomDepth: number;
  }>;
  lessonsLearned: string[];
  provider: string;
}

export interface IDocumentProvider {
  readonly name: string;
  extractText(fileBuffer: Buffer, mimeType: string): Promise<string>;
  extractStructuredData(text: string, documentType: string): Promise<ExtractionResult>;
}

// ─── Demo OCR Provider ────────────────────────────────────────────────────────
class DemoOCRProvider implements IDocumentProvider {
  readonly name = 'DEMO_OCR';

  async extractText(_fileBuffer: Buffer, _mimeType: string): Promise<string> {
    // Demo: return a canned text response for development
    return `
WELL COMPLETION REPORT - DEMO DATA
Well: OIL-DEMO-HISTORICAL
Field: Duliajan, Block A
Total Depth: 3250m

DRILLING EVENTS:
- 2650m: Mud loss observed in Barail Formation. Rate: 8 m3/hr. LCM treatment applied.
- 2850m: Stuck pipe - differential sticking. Resolved with spotting fluid (2hrs NPT).
- 3100m: Overpressure kick. MW increased from 1.34 to 1.38 g/cc. Well secured.

FORMATION TOPS:
Alluvium: 0-450m
Tipam: 450-1200m
Barail: 1200-2800m
Kopili: 2800-3250m

LESSONS LEARNED:
1. Maintain minimum flow rate through Barail shale to prevent clay swelling
2. Increase MW by 0.02 g/cc before entering Kopili fractured limestone
3. Monitor D-exponent for early overpressure detection
    `;
  }

  async extractStructuredData(text: string, _documentType: string): Promise<ExtractionResult> {
    // Demo: parse the canned text
    return {
      rawText: text,
      confidence: 0.65, // lower confidence for demo
      extractedEvents: [
        { eventType: 'MUD_LOSS', depth: 2650, description: 'Mud loss in Barail Formation, 8 m3/hr', severity: 'HIGH' },
        { eventType: 'STUCK_PIPE', depth: 2850, description: 'Differential sticking, 2hrs NPT', severity: 'HIGH' },
        { eventType: 'OVERPRESSURE', depth: 3100, description: 'Kick contained, MW adjusted', severity: 'CRITICAL' },
      ],
      extractedParameters: [
        { paramName: 'mudWeight', value: 1.38, unit: 'g/cc', depth: 3100 },
      ],
      extractedFormations: [
        { name: 'Alluvium', topDepth: 0, bottomDepth: 450 },
        { name: 'Tipam', topDepth: 450, bottomDepth: 1200 },
        { name: 'Barail', topDepth: 1200, bottomDepth: 2800 },
        { name: 'Kopili', topDepth: 2800, bottomDepth: 3250 },
      ],
      lessonsLearned: [
        'Maintain minimum flow rate through Barail shale to prevent clay swelling',
        'Increase MW before entering Kopili fractured limestone',
        'Monitor D-exponent for early overpressure detection',
      ],
      provider: this.name,
    };
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────
function createDocumentProvider(): IDocumentProvider {
  const provider = process.env.OCR_PROVIDER || 'demo';

  switch (provider.toLowerCase()) {
    case 'demo':
    default:
      return new DemoOCRProvider();
    // Future:
    // case 'google_document_ai': return new GoogleDocumentAIProvider();
    // case 'aws_textract': return new AWSTextractProvider();
  }
}

export const documentService: IDocumentProvider = createDocumentProvider();
export default documentService;
