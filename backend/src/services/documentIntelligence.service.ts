/**
 * Document Intelligence Service
 * 
 * Extracts structured drilling domain entities from text:
 *   - Drilling Events (type, depth, formation, severity, description, cause, mitigation, outcome, NPT)
 *   - Drilling Parameters (WOB, RPM, Torque, ROP, Mud Weight, SPP)
 *   - Lessons Learned / Knowledge Entries
 * 
 * Persists results into DocumentExtraction, DrillingEvent, and KnowledgeEntry tables.
 * Prevents duplicate events upon re-processing.
 * Explicitly attributes provider as "Demo AI extraction".
 */

import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { textExtractionService } from './textExtraction.service';
import fs from 'fs';
import path from 'path';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ExtractedDrillingEvent {
  eventType: string;
  depth: number;
  formationName?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  cause?: string;
  mitigation?: string;
  outcome?: string;
  nptHours?: number;
  mudLossRate?: number;
}

export interface ExtractedParameter {
  paramName: string;
  value: number;
  unit: string;
  depth: number;
}

export interface ExtractedKnowledge {
  title: string;
  category: 'LESSON_LEARNED' | 'BEST_PRACTICE' | 'MITIGATION' | 'GEOLOGICAL_NOTE';
  content: string;
  formationRef?: string;
  depthRef?: number;
  wellRef?: string;
  tags: string[];
}

export interface StructuredExtraction {
  provider: 'Demo AI extraction';
  confidence: number;
  summary: string;
  drillingEvents: ExtractedDrillingEvent[];
  parameters: ExtractedParameter[];
  knowledge: ExtractedKnowledge[];
  extractedAt: string;
  method: string;
  pageCount: number;
}

export interface ProcessDocumentResult {
  documentId: string;
  status: 'PROCESSED' | 'OCR_REQUIRED' | 'ERROR';
  confidence: number;
  rawText: string;
  structuredData: StructuredExtraction | null;
  createdEventsCount: number;
  createdKnowledgeCount: number;
  note?: string;
}

export class DocumentIntelligenceService {
  /**
   * Process a document by its ID:
   * 1. Read file from disk
   * 2. Extract text (or mark OCR_REQUIRED)
   * 3. Extract structured entities
   * 4. Persist to DocumentExtraction, DrillingEvent, and KnowledgeEntry
   */
  async processDocument(documentId: string): Promise<ProcessDocumentResult> {
    const doc = await prisma.historicalDocument.findUnique({
      where: { id: documentId },
      include: {
        well: {
          include: {
            formations: { include: { formation: true } },
          },
        },
      },
    });

    if (!doc) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // 1. Locate file on disk
    let fileBuffer: Buffer | null = null;
    if (doc.fileUrl) {
      const fileName = path.basename(doc.fileUrl);
      const candidates = [
        doc.fileUrl,
        path.resolve(process.cwd(), doc.fileUrl.replace(/^\//, '')),
        path.resolve(process.cwd(), 'uploads', fileName),
        path.resolve(process.cwd(), 'backend', 'uploads', fileName),
        path.join(__dirname, '../../', doc.fileUrl.replace(/^\//, '')),
        path.join(__dirname, '../../uploads', fileName),
        path.join(__dirname, '../uploads', fileName),
      ];

      for (const cand of candidates) {
        try {
          if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
            fileBuffer = fs.readFileSync(cand);
            break;
          }
        } catch {
          // continue
        }
      }
    }

    // Fallback: check if file is in uploads directory by document id or title
    if (!fileBuffer) {
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const matchingFile = fs.readdirSync(uploadsDir).find((f) => f.includes(doc.id) || (doc.title && f.includes(doc.title.slice(0, 15))));
        if (matchingFile) {
          fileBuffer = fs.readFileSync(path.join(uploadsDir, matchingFile));
        }
      }
    }

    if (!fileBuffer) {
      await prisma.historicalDocument.update({
        where: { id: documentId },
        data: { status: 'ERROR' },
      });
      return {
        documentId,
        status: 'ERROR',
        confidence: 0,
        rawText: '',
        structuredData: null,
        createdEventsCount: 0,
        createdKnowledgeCount: 0,
        note: 'Source file could not be found on disk.',
      };
    }

    // 2. Extract text using text extraction service
    const extractionResult = await textExtractionService.extractFromPdf(fileBuffer);

    // 3. Handle OCR_REQUIRED
    if (extractionResult.ocrRequired || !extractionResult.success) {
      await prisma.historicalDocument.update({
        where: { id: documentId },
        data: {
          status: 'OCR_REQUIRED',
          processedAt: new Date(),
        },
      });

      // Save OCR status extraction record
      await prisma.documentExtraction.create({
        data: {
          documentId,
          extractionType: 'OCR_STATUS',
          confidence: 0.0,
          rawText: extractionResult.note || 'OCR required for this document.',
          structuredData: JSON.stringify({
            status: 'OCR_REQUIRED',
            message: extractionResult.note,
            provider: 'OCR Abstraction',
          }),
          aiProvider: 'OCR Abstraction',
        },
      });

      return {
        documentId,
        status: 'OCR_REQUIRED',
        confidence: 0,
        rawText: '',
        structuredData: null,
        createdEventsCount: 0,
        createdKnowledgeCount: 0,
        note: extractionResult.note,
      };
    }

    // 4. Perform NLP / Pattern Entity Extraction
    const structured = this.extractDomainEntities(
      extractionResult.text,
      doc.well?.wellName || null,
      doc.well?.formations?.map((f) => f.formation.name) || []
    );
    structured.pageCount = extractionResult.pageCount;
    structured.method = extractionResult.method;

    // 5. Persist DocumentExtraction record
    await prisma.documentExtraction.create({
      data: {
        documentId,
        extractionType: 'FULL_EXTRACTION',
        confidence: structured.confidence,
        rawText: extractionResult.text,
        structuredData: JSON.stringify(structured),
        aiProvider: 'Demo AI extraction',
      },
    });

    // 6. Persist Drilling Events (preventing duplicates for this source document)
    let createdEventsCount = 0;

    // Auto-detect and link well if document didn't have one specified
    let targetWellId = doc.wellId;
    if (!targetWellId) {
      // Try to find well from text or fall back to active well
      const detectedName = structured.drillingEvents[0]?.description || extractionResult.text;
      const allWells = await prisma.well.findMany({ select: { id: true, wellName: true, wellId: true } });
      const matched = allWells.find(
        (w) =>
          extractionResult.text.toLowerCase().includes(w.wellName.toLowerCase()) ||
          extractionResult.text.toLowerCase().includes(w.wellId.toLowerCase())
      );
      if (matched) {
        targetWellId = matched.id;
        await prisma.historicalDocument.update({
          where: { id: documentId },
          data: { wellId: matched.id },
        });
      } else {
        // Fall back to active well if available
        const activeWell = await prisma.well.findFirst({ where: { status: 'ACTIVE' } });
        if (activeWell) {
          targetWellId = activeWell.id;
          await prisma.historicalDocument.update({
            where: { id: documentId },
            data: { wellId: activeWell.id },
          });
        }
      }
    }

    if (targetWellId && structured.drillingEvents.length > 0) {
      // Clean up previous events from this document to avoid duplicates
      await prisma.drillingEvent.deleteMany({
        where: { sourceDocumentId: documentId },
      });

      // Fetch all formations for matching
      const allFormations = await prisma.formation.findMany();

      for (const ev of structured.drillingEvents) {
        // Try to match formation
        let formationId: string | null = null;
        if (ev.formationName) {
          const matched = allFormations.find(
            (f) =>
              f.name.toLowerCase().includes(ev.formationName!.toLowerCase()) ||
              ev.formationName!.toLowerCase().includes(f.name.toLowerCase())
          );
          formationId = matched?.id || null;
        }

        await prisma.drillingEvent.create({
          data: {
            wellId: targetWellId,
            formationId,
            eventType: ev.eventType,
            depth: ev.depth,
            timestamp: new Date(),
            severity: ev.severity,
            description: ev.description,
            cause: ev.cause || null,
            mitigation: ev.mitigation || null,
            outcome: ev.outcome || null,
            nptHours: ev.nptHours || null,
            mudLossRate: ev.mudLossRate || null,
            sourceDocumentId: documentId,
          },
        });
        createdEventsCount++;
      }
    }

    // 7. Persist Knowledge Entries (preventing duplicates for this source document)
    let createdKnowledgeCount = 0;
    for (const kn of structured.knowledge) {
      const tagIdentifier = `doc:${documentId}`;
      const existing = await prisma.knowledgeEntry.findFirst({
        where: {
          tags: { contains: tagIdentifier },
          title: kn.title,
        },
      });

      if (!existing) {
        await prisma.knowledgeEntry.create({
          data: {
            title: kn.title,
            category: kn.category,
            content: kn.content,
            tags: JSON.stringify([...kn.tags, tagIdentifier, `well:${doc.well?.wellName || 'unknown'}`]),
            wellRef: kn.wellRef || doc.well?.wellName || null,
            depthRef: kn.depthRef || null,
            formationRef: kn.formationRef || null,
            author: 'Extracted via Demo AI',
            verified: false,
          },
        });
        createdKnowledgeCount++;
      }
    }

    // 8. Update Document Status
    await prisma.historicalDocument.update({
      where: { id: documentId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    logger.info(
      `Successfully processed document ${documentId}: ${createdEventsCount} events, ${createdKnowledgeCount} knowledge entries created.`
    );

    return {
      documentId,
      status: 'PROCESSED',
      confidence: structured.confidence,
      rawText: extractionResult.text,
      structuredData: structured,
      createdEventsCount,
      createdKnowledgeCount,
    };
  }

  /**
   * Deterministic entity extraction using domain heuristics.
   * Explicitly tagged with provider "Demo AI extraction".
   */
  private extractDomainEntities(
    text: string,
    wellName: string | null,
    wellFormations: string[]
  ): StructuredExtraction {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    const drillingEvents: ExtractedDrillingEvent[] = [];
    const parameters: ExtractedParameter[] = [];
    const knowledge: ExtractedKnowledge[] = [];

    // Helper regex patterns
    const depthRegex = /(?:depth[:\s]+|at\s+|@\s*)(\d{3,5})(?:\s*m)?/i;
    const nptRegex = /(?:npt(?:\s*hours)?[:\s]+|(\d+(?:\.\d+)?)\s*(?:hrs?|hours)\s*npt)/i;
    const mudLossRateRegex = /(\d+(?:\.\d+)?)\s*(?:m3\/hr|m³\/hr|bph)/i;

    // Detect well name from text if not provided
    let detectedWell = wellName;
    const wellMatch = text.match(/Well[:\s]+([A-Za-z0-9\-_]+)/i);
    if (wellMatch && wellMatch[1]) {
      detectedWell = wellMatch[1];
    }

    // Detect formation from text
    const knownFormations = [
      'Barail Group',
      'Barail',
      'Kopili Formation',
      'Kopili',
      'Tipam Sandstone',
      'Tipam',
      'Girujan Clay',
      'Girujan',
      'Sylhet Limestone',
      'Sylhet',
      'Jaintia Group',
      'Alluvium',
    ];

    const findFormation = (str: string): string | undefined => {
      for (const f of [...wellFormations, ...knownFormations]) {
        if (str.toLowerCase().includes(f.toLowerCase())) {
          return f.includes('Barail')
            ? 'Barail Group'
            : f.includes('Kopili')
            ? 'Kopili Formation'
            : f.includes('Tipam')
            ? 'Tipam Sandstone'
            : f.includes('Girujan')
            ? 'Girujan Clay'
            : f.includes('Sylhet')
            ? 'Sylhet Limestone'
            : f;
        }
      }
      return undefined;
    };

    // ─── 1. Detect Drilling Events ───────────────────────────────────────────
    const eventMatchers: Array<{
      type: string;
      keywords: RegExp;
      defaultSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }> = [
      {
        type: 'STUCK_PIPE',
        keywords: /stuck\s*pipe|differential\s*sticking|mechanical\s*stuck|pipe\s*sticking/i,
        defaultSeverity: 'HIGH',
      },
      {
        type: 'MUD_LOSS',
        keywords: /mud\s*loss|lost\s*circulation|loss\s*of\s*returns|loss\s*zone/i,
        defaultSeverity: 'HIGH',
      },
      {
        type: 'TORQUE_SPIKE',
        keywords: /torque\s*spike|high\s*torque|excessive\s*torque|torque\s*erratic/i,
        defaultSeverity: 'MEDIUM',
      },
      {
        type: 'OVERPRESSURE',
        keywords: /overpressure|high\s*pore\s*pressure|abnormal\s*pressure|pressure\s*kick/i,
        defaultSeverity: 'CRITICAL',
      },
      {
        type: 'KICK',
        keywords: /well\s*kick|gas\s*influx|kick\s*encountered|gas\s*kick/i,
        defaultSeverity: 'CRITICAL',
      },
      {
        type: 'CEMENTING_ISSUE',
        keywords: /cementing\s*issue|poor\s*cement\s*bond|cbl\s*channeling|channeling\s*observed/i,
        defaultSeverity: 'MEDIUM',
      },
    ];

    // Check full text or blocks for events
    for (const matcher of eventMatchers) {
      if (matcher.keywords.test(text)) {
        // Find line or sentence context
        const relevantLines = lines.filter((l) => matcher.keywords.test(l) || /description|cause|mitigation|outcome/i.test(l));

        // Depth discovery
        const depthMatch = text.match(depthRegex);
        const depth = depthMatch ? parseFloat(depthMatch[1]) : 2800;

        // Formation discovery
        const formationName = findFormation(text);

        // Extract cause, mitigation, outcome
        let cause: string | undefined;
        let mitigation: string | undefined;
        let outcome: string | undefined;
        let description = '';

        for (const line of lines) {
          if (matcher.keywords.test(line)) {
            description = line.replace(/^[-\*\d\.\s]+/, '').replace(/^drill(?:ing)?\s*event[:\s]*/i, '');
          }
          if (/^cause[:\s]+/i.test(line)) {
            cause = line.replace(/^cause[:\s]+/i, '').trim();
          }
          if (/^mitigation[:\s]+/i.test(line)) {
            mitigation = line.replace(/^mitigation[:\s]+/i, '').trim();
          }
          if (/^outcome[:\s]+/i.test(line)) {
            outcome = line.replace(/^outcome[:\s]+/i, '').trim();
          }
        }

        if (!description) {
          description = relevantLines[0] || `${matcher.type.replace('_', ' ')} incident reported in drilling report`;
        }

        // NPT discovery
        const nptMatch = text.match(nptRegex);
        const nptHours = nptMatch ? parseFloat(nptMatch[1] || '0') : undefined;

        // Mud loss rate discovery
        const mlMatch = text.match(mudLossRateRegex);
        const mudLossRate = mlMatch ? parseFloat(mlMatch[1]) : undefined;

        // Severity discovery
        let severity = matcher.defaultSeverity;
        if (/severity[:\s]+critical/i.test(text)) severity = 'CRITICAL';
        else if (/severity[:\s]+high/i.test(text)) severity = 'HIGH';
        else if (/severity[:\s]+medium/i.test(text)) severity = 'MEDIUM';
        else if (/severity[:\s]+low/i.test(text)) severity = 'LOW';

        drillingEvents.push({
          eventType: matcher.type,
          depth,
          formationName,
          severity,
          description: description.slice(0, 300),
          cause: cause || undefined,
          mitigation: mitigation || undefined,
          outcome: outcome || undefined,
          nptHours: nptHours && !isNaN(nptHours) ? nptHours : undefined,
          mudLossRate: mudLossRate && !isNaN(mudLossRate) ? mudLossRate : undefined,
        });
      }
    }

    // ─── 2. Detect Drilling Parameters ───────────────────────────────────────
    const paramPatterns = [
      { name: 'wob', unit: 't', regex: /wob[:\s]+(\d+(?:\.\d+)?)\s*(?:t|tonnes)?/i },
      { name: 'rpm', unit: 'rpm', regex: /rpm[:\s]+(\d+(?:\.\d+)?)/i },
      { name: 'torque', unit: 'kN.m', regex: /torque[:\s]+(\d+(?:\.\d+)?)\s*(?:kn\.?m)?/i },
      { name: 'rop', unit: 'm/hr', regex: /rop[:\s]+(\d+(?:\.\d+)?)\s*(?:m\/hr)?/i },
      { name: 'mudWeight', unit: 'g/cc', regex: /(?:mw|mud\s*weight)[:\s]+(\d+(?:\.\d+)?)\s*(?:g\/cc)?/i },
      { name: 'standpipePressure', unit: 'bar', regex: /(?:spp|standpipe\s*pressure)[:\s]+(\d+(?:\.\d+)?)\s*(?:bar)?/i },
    ];

    const defaultDepth = drillingEvents[0]?.depth || 2800;

    for (const p of paramPatterns) {
      const match = text.match(p.regex);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) {
          parameters.push({
            paramName: p.name,
            value: val,
            unit: p.unit,
            depth: defaultDepth,
          });
        }
      }
    }

    // ─── 3. Detect Lessons Learned / Knowledge ──────────────────────────────
    for (const line of lines) {
      if (/lesson(?:s)?\s*learned[:\s]*/i.test(line) || /best\s*practice[:\s]*/i.test(line)) {
        const cleanContent = line.replace(/^(?:\d+[\.\)]\s*)?(?:lesson(?:s)?\s*learned|best\s*practice)[:\s]*/i, '').trim();
        if (cleanContent.length > 15) {
          const isBestPractice = /best\s*practice/i.test(line);
          const formRef = findFormation(cleanContent) || findFormation(text);
          const category = isBestPractice ? 'BEST_PRACTICE' : 'LESSON_LEARNED';

          knowledge.push({
            title: cleanContent.slice(0, 60) + (cleanContent.length > 60 ? '...' : ''),
            category,
            content: cleanContent,
            formationRef: formRef,
            depthRef: defaultDepth,
            wellRef: detectedWell || undefined,
            tags: [
              drillingEvents[0]?.eventType?.toLowerCase() || 'drilling',
              formRef ? formRef.toLowerCase().replace(/\s+/g, '-') : 'general',
              'offset-intelligence',
            ],
          });
        }
      }
    }

    // If mitigation was extracted from an event, automatically turn it into a MITIGATION knowledge entry
    for (const ev of drillingEvents) {
      if (ev.mitigation && ev.mitigation.length > 20) {
        knowledge.push({
          title: `${ev.eventType.replace('_', ' ')} Mitigation Protocol`,
          category: 'MITIGATION',
          content: ev.mitigation,
          formationRef: ev.formationName,
          depthRef: ev.depth,
          wellRef: detectedWell || undefined,
          tags: [ev.eventType.toLowerCase(), 'mitigation', 'drilling-safety'],
        });
      }
    }

    // Confidence scoring based on amount of structured domain data extracted
    let confidence = 0.55;
    if (drillingEvents.length > 0) confidence += 0.2;
    if (drillingEvents.some((e) => e.cause && e.mitigation)) confidence += 0.1;
    if (parameters.length > 0) confidence += 0.05;
    if (knowledge.length > 0) confidence += 0.05;
    confidence = Math.min(0.95, confidence);

    const summary = drillingEvents.length > 0
      ? `Extracted ${drillingEvents.length} drilling event(s) (${drillingEvents.map((e) => e.eventType).join(', ')}) at depth ~${defaultDepth}m.`
      : `Extracted ${parameters.length} drilling parameter(s) and general geological notes.`;

    return {
      provider: 'Demo AI extraction',
      confidence: Math.round(confidence * 100) / 100,
      summary,
      drillingEvents,
      parameters,
      knowledge,
      extractedAt: new Date().toISOString(),
      method: 'SELECTABLE_TEXT',
      pageCount: 1,
    };
  }
}

export const documentIntelligenceService = new DocumentIntelligenceService();
export default documentIntelligenceService;
