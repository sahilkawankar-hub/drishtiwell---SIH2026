/**
 * OCR Service Abstraction
 * 
 * Defines interface for optical character recognition on scanned PDFs or images.
 * If OCR is not available, documents containing no selectable text are clearly
 * marked as "OCR required" rather than fabricating extraction results.
 */

export interface IOCRProvider {
  readonly name: string;
  isAvailable(): boolean;
  extractText(fileBuffer: Buffer, mimeType: string): Promise<string | null>;
}

export class NoopOCRProvider implements IOCRProvider {
  readonly name = 'NOOP_OCR';

  isAvailable(): boolean {
    return false;
  }

  async extractText(_fileBuffer: Buffer, _mimeType: string): Promise<string | null> {
    // OCR is not currently configured
    return null;
  }
}

/**
 * Future pluggable providers (e.g. Tesseract, Google Document AI, AWS Textract)
 * can be registered here.
 */
function createOCRProvider(): IOCRProvider {
  const providerType = (process.env.OCR_PROVIDER || '').toLowerCase();
  switch (providerType) {
    // case 'tesseract': return new TesseractOCRProvider();
    // case 'google': return new GoogleDocumentAIProvider();
    default:
      return new NoopOCRProvider();
  }
}

export const ocrProvider: IOCRProvider = createOCRProvider();
