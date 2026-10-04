/**
 * Documents Controller
 * 
 * Handles document upload, listing, retrieval, processing, and extraction querying.
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { documentIntelligenceService } from '../services/documentIntelligence.service';
import logger from '../utils/logger';

// Document type mapping helper
const DOC_TYPE_MAP: Record<string, string> = {
  'Daily Drilling Report': 'DAILY_REPORT',
  'Well Completion Report': 'COMPLETION_REPORT',
  'Mud Log': 'MUD_LOG',
  'Drilling Report': 'DRILLING_REPORT',
  'Geological Report': 'GEOLOGICAL_REPORT',
  'Other': 'OTHER',
  // In case code is already passed
  'DAILY_REPORT': 'DAILY_REPORT',
  'COMPLETION_REPORT': 'COMPLETION_REPORT',
  'MUD_LOG': 'MUD_LOG',
  'DRILLING_REPORT': 'DRILLING_REPORT',
  'GEOLOGICAL_REPORT': 'GEOLOGICAL_REPORT',
  'OTHER': 'OTHER',
  'WELL_REPORT': 'WELL_REPORT',
  'POST_WELL_ANALYSIS': 'POST_WELL_ANALYSIS',
};

/**
 * POST /api/documents/upload
 * 
 * Uploads a PDF file with metadata and immediately processes it through
 * the document intelligence workflow.
 */
export async function uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      throw new AppError('No file uploaded. Please provide a PDF file.', 400, true, 'FILE_MISSING');
    }

    const { title, documentType, wellId, description } = req.body;

    if (!title || !title.trim()) {
      throw new AppError('Document name (title) is required.', 400, true, 'TITLE_MISSING');
    }

    // Normalize document type
    const normalizedType = DOC_TYPE_MAP[documentType] || 'OTHER';

    // Verify well if provided
    let validWellId: string | null = null;
    if (wellId && wellId !== 'none' && wellId !== '') {
      const well = await prisma.well.findFirst({
        where: { OR: [{ id: wellId }, { wellId }] },
      });
      if (well) validWellId = well.id;
    }

    // Relative file URL
    const fileUrl = `/uploads/${file.filename}`;

    // 1. Create HistoricalDocument in database
    const document = await prisma.historicalDocument.create({
      data: {
        title: title.trim(),
        documentType: normalizedType,
        wellId: validWellId,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'PENDING',
      },
      include: {
        well: true,
      },
    });

    logger.info(`Uploaded document ${document.id}: ${document.title} (${file.size} bytes)`);

    // 2. Automatically process document through Document Intelligence pipeline
    let extractionResult = null;
    try {
      extractionResult = await documentIntelligenceService.processDocument(document.id);
    } catch (procErr: any) {
      logger.error(`Error auto-processing document ${document.id}: ${procErr.message}`);
    }

    // Fetch the updated document with extractions
    const updatedDoc = await prisma.historicalDocument.findUnique({
      where: { id: document.id },
      include: {
        well: { select: { id: true, wellName: true, wellId: true } },
        extractions: true,
        drillingEvents: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded and analyzed successfully',
      data: updatedDoc,
      extraction: extractionResult,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents
 * 
 * List all documents with optional filtering.
 */
export async function getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wellId, documentType, status } = req.query;

    const documents = await prisma.historicalDocument.findMany({
      where: {
        ...(wellId ? { wellId: wellId as string } : {}),
        ...(documentType ? { documentType: documentType as string } : {}),
        ...(status ? { status: status as string } : {}),
      },
      include: {
        well: { select: { id: true, wellName: true, wellId: true } },
        extractions: {
          orderBy: { extractedAt: 'desc' },
          take: 1,
        },
        drillingEvents: {
          select: { id: true, eventType: true, depth: true, severity: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ success: true, data: documents, count: documents.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/:id
 * 
 * Get full document details, including well, extractions, and created drilling events.
 */
export async function getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const doc = await prisma.historicalDocument.findUnique({
      where: { id },
      include: {
        well: {
          include: {
            formations: { include: { formation: true } },
          },
        },
        extractions: {
          orderBy: { extractedAt: 'desc' },
        },
        drillingEvents: {
          include: {
            formation: true,
          },
          orderBy: { depth: 'asc' },
        },
      },
    });

    if (!doc) {
      throw new AppError('Document not found', 404, true, 'DOCUMENT_NOT_FOUND');
    }

    // Also look up any knowledge entries created for this document
    const knowledgeEntries = await prisma.knowledgeEntry.findMany({
      where: {
        tags: { contains: `doc:${doc.id}` },
      },
    });

    res.json({
      success: true,
      data: {
        ...doc,
        knowledgeEntries,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/documents/:id/process
 * 
 * Trigger processing or re-processing of a document.
 */
export async function processDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;

    const doc = await prisma.historicalDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new AppError('Document not found', 404, true, 'DOCUMENT_NOT_FOUND');
    }

    const result = await documentIntelligenceService.processDocument(id);

    const updatedDoc = await prisma.historicalDocument.findUnique({
      where: { id },
      include: {
        well: true,
        extractions: { orderBy: { extractedAt: 'desc' } },
        drillingEvents: { include: { formation: true } },
      },
    });

    res.json({
      success: true,
      message: result.status === 'PROCESSED'
        ? 'Document processed successfully'
        : result.note || 'Document processed with notice',
      data: updatedDoc,
      extractionResult: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/:id/extraction
 * 
 * Retrieve extraction results and structured data for a document.
 */
export async function getDocumentExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;

    const doc = await prisma.historicalDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new AppError('Document not found', 404, true, 'DOCUMENT_NOT_FOUND');
    }

    const extraction = await prisma.documentExtraction.findFirst({
      where: { documentId: id },
      orderBy: { extractedAt: 'desc' },
    });

    if (!extraction) {
      res.json({
        success: true,
        data: null,
        message: 'No extraction record found for this document.',
      });
      return;
    }

    let parsedStructured = null;
    try {
      if (extraction.structuredData) {
        parsedStructured = JSON.parse(extraction.structuredData);
      }
    } catch {
      parsedStructured = extraction.structuredData;
    }

    res.json({
      success: true,
      data: {
        id: extraction.id,
        documentId: extraction.documentId,
        extractionType: extraction.extractionType,
        confidence: extraction.confidence,
        rawText: extraction.rawText,
        structuredData: parsedStructured,
        aiProvider: extraction.aiProvider,
        extractedAt: extraction.extractedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
