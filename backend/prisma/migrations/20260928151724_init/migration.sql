-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ENGINEER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Well" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "wellName" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "spudDate" DATETIME,
    "completionDate" DATETIME,
    "currentDepth" REAL NOT NULL DEFAULT 0,
    "totalDepth" REAL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "operator" TEXT NOT NULL DEFAULT 'Oil India Limited',
    "wellType" TEXT NOT NULL DEFAULT 'VERTICAL',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "targetFormation" TEXT,
    "currentFormation" TEXT
);

-- CreateTable
CREATE TABLE "WellTrajectory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "measuredDepth" REAL NOT NULL,
    "trueVerticalDepth" REAL NOT NULL,
    "inclination" REAL NOT NULL,
    "azimuth" REAL NOT NULL,
    "northing" REAL NOT NULL,
    "easting" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "ageEra" TEXT,
    "lithology" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WellFormation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "topDepth" REAL NOT NULL,
    "bottomDepth" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WellFormation_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WellFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "formationId" TEXT,
    "eventType" TEXT NOT NULL,
    "depth" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "cause" TEXT,
    "mitigation" TEXT,
    "outcome" TEXT,
    "duration" REAL,
    "nptHours" REAL,
    "mudLossRate" REAL,
    "sourceDocumentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrillingEvent_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrillingEvent_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DrillingEvent_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "HistoricalDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrillingParameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "depth" REAL NOT NULL,
    "wob" REAL,
    "rpm" REAL,
    "torque" REAL,
    "rop" REAL,
    "mudWeight" REAL,
    "standpipePressure" REAL,
    "flowRate" REAL,
    "hookLoad" REAL,
    "ecd" REAL,
    "mse" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrillingParameter_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoricalDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "HistoricalDocument_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentExtraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "extractionType" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "rawText" TEXT,
    "structuredData" TEXT,
    "extractedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiProvider" TEXT,
    CONSTRAINT "DocumentExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HistoricalDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "formationId" TEXT,
    "riskType" TEXT NOT NULL,
    "depth" REAL NOT NULL,
    "severity" TEXT NOT NULL,
    "probability" REAL NOT NULL,
    "evidence" TEXT,
    "historicalRefs" TEXT,
    "mitigation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskEvent_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiskEvent_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "riskType" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "riskEventId" TEXT,
    "userId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "depth" REAL,
    "formation" TEXT,
    "message" TEXT NOT NULL,
    "evidence" TEXT,
    "recommendedAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alert_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Alert_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wellId" TEXT NOT NULL,
    "userId" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rationale" TEXT,
    "references" TEXT,
    "aiProvider" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_wellId_fkey" FOREIGN KEY ("wellId") REFERENCES "Well" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WellComparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activeWellId" TEXT NOT NULL,
    "offsetWellId" TEXT NOT NULL,
    "similarityScore" REAL NOT NULL DEFAULT 0.0,
    "matchedFormations" TEXT,
    "comparedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "WellComparison_activeWellId_fkey" FOREIGN KEY ("activeWellId") REFERENCES "Well" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WellComparison_offsetWellId_fkey" FOREIGN KEY ("offsetWellId") REFERENCES "Well" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "wellRef" TEXT,
    "depthRef" REAL,
    "formationRef" TEXT,
    "author" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Well_wellId_key" ON "Well"("wellId");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_name_key" ON "Formation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_code_key" ON "Formation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WellFormation_wellId_formationId_key" ON "WellFormation"("wellId", "formationId");

-- CreateIndex
CREATE INDEX "DrillingParameter_wellId_timestamp_idx" ON "DrillingParameter"("wellId", "timestamp");
