// Shared TypeScript types for eRTMAC-NWIS
// These mirror the Prisma schema

export type WellStatus = 'ACTIVE' | 'DRILLING' | 'COMPLETED' | 'ABANDONED' | 'PLANNED';
export type WellType = 'VERTICAL' | 'DIRECTIONAL' | 'HORIZONTAL';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type RiskStatus = 'ACTIVE' | 'RESOLVED' | 'MONITORING';

export interface Formation {
  id: string;
  name: string;
  code: string;
  description?: string;
  ageEra?: string;
  lithology?: string;
  createdAt: string;
}

export interface WellFormation {
  id: string;
  wellId: string;
  formationId: string;
  topDepth: number;
  bottomDepth: number;
  isActive: boolean;
  formation: Formation;
}

export interface Well {
  id: string;
  wellId: string;
  wellName: string;
  field: string;
  block: string;
  latitude: number;
  longitude: number;
  spudDate?: string;
  completionDate?: string;
  currentDepth: number;
  totalDepth?: number;
  status: WellStatus;
  operator: string;
  wellType: string;
  isActive: boolean;
  targetFormation?: string;
  currentFormation?: string;
  createdAt: string;
  updatedAt: string;
  formations?: WellFormation[];
  drillingEvents?: DrillingEvent[];
  drillingParameters?: DrillingParameter[];
  riskEvents?: RiskEvent[];
  historicalDocuments?: HistoricalDocument[];
  _count?: {
    drillingEvents: number;
    alerts: number;
    riskEvents: number;
  };
}

export interface WellWithDistance extends Well {
  distanceKm: number;
}

/** Richer nearby-well entry returned by /api/wells/nearby-intelligence */
export interface NearbyWell extends Well {
  distanceKm: number;
  drillingEvents: DrillingEvent[];   // last 3
  riskEvents: RiskEvent[];           // active, up to 3
}

/** Full response shape for /api/wells/nearby-intelligence */
export interface NearbyWellsIntelligenceResponse {
  activeWell: Well;
  nearbyWells: NearbyWell[];
  radiusKm: number;
  count: number;
}

export interface DrillingEvent {
  id: string;
  wellId: string;
  formationId?: string;
  eventType: string;
  depth: number;
  timestamp: string;
  severity: Severity;
  description: string;
  cause?: string;
  mitigation?: string;
  outcome?: string;
  duration?: number;
  nptHours?: number;
  mudLossRate?: number;
  formation?: Formation;
  well?: { id: string; wellId: string; wellName: string; field: string; block: string };
  sourceDocument?: { id: string; title: string; documentType: string } | null;
}

export interface DrillingParameter {
  id: string;
  wellId: string;
  timestamp: string;
  depth: number;
  wob?: number;
  rpm?: number;
  torque?: number;
  rop?: number;
  mudWeight?: number;
  standpipePressure?: number;
  flowRate?: number;
  hookLoad?: number;
  ecd?: number;
}

export interface RiskEvent {
  id: string;
  wellId: string;
  formationId?: string;
  riskType: string;
  depth: number;
  severity: Severity;
  probability: number;
  evidence?: string; // JSON string
  historicalRefs?: string; // JSON string
  mitigation?: string;
  status: RiskStatus;
  detectedAt: string;
  formation?: Formation;
}

export interface Alert {
  id: string;
  wellId: string;
  riskEventId?: string;
  alertType: string;
  severity: AlertSeverity;
  depth?: number;
  formation?: string;
  message: string;
  evidence?: string; // JSON string
  recommendedAction?: string;
  status: AlertStatus;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  well?: { wellName: string; wellId: string };
}

export interface Recommendation {
  id: string;
  wellId: string;
  category: string;
  priority: string;
  title: string;
  content: string;
  rationale?: string;
  references?: string; // JSON string
  aiProvider?: string;
  confidence: number;
  status: string;
  createdAt: string;
  well?: { wellName: string; wellId: string };
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  tags?: string[] | string;
  wellRef?: string;
  depthRef?: number;
  formationRef?: string;
  author?: string;
  verified: boolean;
  createdAt: string;
}

export interface DocumentExtraction {
  id: string;
  documentId: string;
  extractionType: string;
  confidence: number;
  rawText?: string;
  structuredData?: any;
  aiProvider?: string;
  extractedAt: string;
}

export interface HistoricalDocument {
  id: string;
  wellId?: string;
  title: string;
  documentType: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  status: string;
  uploadedAt: string;
  processedAt?: string;
  well?: { id?: string; wellName: string; wellId: string };
  extractions?: DocumentExtraction[];
  drillingEvents?: Array<{ id: string; eventType: string; depth: number; severity: string }>;
}

export interface HistoricalDocumentDetail extends HistoricalDocument {
  drillingEvents?: DrillingEvent[];
  knowledgeEntries?: KnowledgeEntry[];
  well?: Well;
}

export interface KnowledgeSearchResult {
  query: {
    q?: string;
    eventType?: string;
    formation?: string;
    wellId?: string;
    wellName?: string;
    minDepth?: number;
    maxDepth?: number;
    category?: string;
  };
  totalMatches: number;
  knowledgeEntries: KnowledgeEntry[];
  drillingEvents: Array<DrillingEvent & {
    sourceDocument?: { id: string; title: string; documentType: string } | null;
  }>;
  facets: {
    categories: Record<string, number>;
    eventTypes: Record<string, number>;
    formations: Record<string, number>;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: {
    message: string;
    code?: string;
  };
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime: { seconds: number; formatted: string };
  database: { status: string; latencyMs: number };
  responseMs: number;
}

/** Filters used by the nearby wells intelligence query */
export interface NearbyWellsFilters {
  activeWellId: string;
  radiusKm: number;
  status?: string;
  wellType?: string;
  formationId?: string;
}

// ─── Offset-Well Intelligence Types ──────────────────────────────────────────

export interface RelevantEvent {
  id: string;
  eventType: string;
  depth: number;
  severity: string;
  description: string;
  cause: string | null;
  mitigation: string | null;
  outcome: string | null;
  nptHours: number | null;
  mudLossRate: number | null;
  timestamp: string;
  wellId: string;
  wellName: string;
  formationName: string | null;
  depthDelta: number;
}

export interface OffsetWellScore {
  well: {
    id: string;
    wellId: string;
    wellName: string;
    field: string;
    block: string;
    latitude: number;
    longitude: number;
    status: string;
    wellType: string;
    currentDepth: number;
    totalDepth: number | null;
  };
  distanceKm: number;
  formationMatch: {
    matchedFormations: string[];
    activeWellFormations: string[];
    offsetWellFormations: string[];
    overlapRatio: number;
  };
  depthSimilarity: number;
  relevantEvents: RelevantEvent[];
  eventRelevanceScore: number;
  similarityScore: number;
}

export interface AssessedRisk {
  riskType: string;
  riskLabel: string;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  detectionReason: string;
  evidence: string[];
  sourceWells: Array<{
    wellId: string;
    wellName: string;
    distanceKm: number;
    eventDepth: number;
    eventSeverity: string;
    depthDelta: number;
  }>;
  recommendedAction: string;
  eventCount: number;
  nearestEventDepthDelta: number;
  nearestEventDistanceKm: number;
}

export interface RiskAssessmentResult {
  wellId: string;
  wellName: string;
  currentDepth: number;
  currentFormation: string | null;
  depthWindow: number;
  assessedAt: string;
  risks: AssessedRisk[];
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: {
    totalRisks: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

export interface ActiveWellIntelligence {
  activeWell: {
    id: string;
    wellId: string;
    wellName: string;
    currentDepth: number;
    totalDepth: number | null;
    currentFormation: string | null;
    currentFormationName: string | null;
    status: string;
    field: string;
    block: string;
    latitude: number;
    longitude: number;
    wellType: string;
    spudDate: string | null;
  };
  offsetWells: OffsetWellScore[];
  allRelevantEvents: RelevantEvent[];
  depthWindow: number;
  radiusKm: number;
  summary: {
    totalOffsetWells: number;
    totalRelevantEvents: number;
    highestSimilarity: number;
    nearestWellKm: number;
    dominantRiskTypes: string[];
  };
  riskAssessment: RiskAssessmentResult;
}

