/**
 * Text Extraction Service
 * 
 * Handles extraction of text from PDF files using pdf-parse.
 * If selectable text is present, extracts and normalizes it.
 * If the document is image-based/scanned and OCR is not configured,
 * marks the document as "OCR required".
 */

import { ocrProvider } from './ocr.service';
import logger from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');

export interface TextExtractionResult {
  success: boolean;
  text: string;
  ocrRequired: boolean;
  method: 'SELECTABLE_TEXT' | 'OCR' | 'OCR_REQUIRED';
  pageCount: number;
  note?: string;
}

export class TextExtractionService {
  /**
   * Extract text from a PDF buffer.
   */
  async extractFromPdf(fileBuffer: Buffer): Promise<TextExtractionResult> {
    try {
      // 1. Attempt selectable text extraction using PDFParse
      const parser = new PDFParse({ data: fileBuffer });
      await parser.load();
      const textResult = await parser.getText();
      await parser.destroy();

      const rawText = textResult?.text?.trim() || '';
      const pageCount = textResult?.total || 1;

      // Check if we extracted meaningful selectable text (not just empty whitespace/symbols)
      const cleanWords = rawText.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();

      if (cleanWords.length >= 25) {
        return {
          success: true,
          text: rawText,
          ocrRequired: false,
          method: 'SELECTABLE_TEXT',
          pageCount,
        };
      }

      logger.warn('PDF contains insufficient selectable text. Checking OCR provider...');

      // 2. Fall back to OCR provider if selectable text is missing
      if (ocrProvider.isAvailable()) {
        const ocrText = await ocrProvider.extractText(fileBuffer, 'application/pdf');
        if (ocrText && ocrText.trim().length >= 25) {
          return {
            success: true,
            text: ocrText.trim(),
            ocrRequired: false,
            method: 'OCR',
            pageCount,
          };
        }
      }

      // 3. OCR is not available or failed -> clearly mark as OCR required
      return {
        success: false,
        text: '',
        ocrRequired: true,
        method: 'OCR_REQUIRED',
        pageCount,
        note: 'Scanned document / image-based PDF. Selectable text not found. Connect an OCR provider (e.g. Tesseract or Google Document AI) to process this document.',
      };
    } catch (err: any) {
      logger.error(`Error in text extraction: ${err.message}`);
      return {
        success: false,
        text: '',
        ocrRequired: true,
        method: 'OCR_REQUIRED',
        pageCount: 0,
        note: `Text extraction error: ${err.message}. OCR may be required.`,
      };
    }
  }
}

export const textExtractionService = new TextExtractionService();
export default textExtractionService;
