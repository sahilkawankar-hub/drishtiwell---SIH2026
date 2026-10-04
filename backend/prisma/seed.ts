/**
 * eRTMAC-NWIS Database Seed File
 * 
 * ⚠️  ALL DATA IS FICTIONAL / DEMO ONLY
 * ⚠️  Does NOT represent actual Oil India Limited data
 * ⚠️  Created for SIH 2026 Prototype Development Only
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🛢️  Seeding eRTMAC-NWIS database with DEMO data...');
  console.log('⚠️  All data is fictional and created for demonstration only.\n');

  // ─── 1. FORMATIONS ─────────────────────────────────────────────────────────
  console.log('Creating formations...');

  const formations = await Promise.all([
    prisma.formation.upsert({
      where: { code: 'FRM_ALLUVIUM' },
      update: {},
      create: {
        name: 'Alluvium',
        code: 'FRM_ALLUVIUM',
        description: 'Quaternary alluvial deposits — surface to shallow depth',
        ageEra: 'Quaternary',
        lithology: 'Clay, Sand, Gravel',
      },
    }),
    prisma.formation.upsert({
      where: { code: 'FRM_TIPAM' },
      update: {},
      create: {
        name: 'Tipam Sandstone',
        code: 'FRM_TIPAM',
        description: 'Plio-Miocene fluvial sandstone — productive formation',
        ageEra: 'Pliocene-Miocene',
        lithology: 'Sandstone with shale interbeds',
      },
    }),
    prisma.formation.upsert({
      where: { code: 'FRM_GIRUJAN' },
      update: {},
      create: {
        name: 'Girujan Clay',
        code: 'FRM_GIRUJAN',
        description: 'Miocene clay — prone to wellbore instability',
        ageEra: 'Miocene',
        lithology: 'Clay, Shale',
      },
    }),
    prisma.formation.upsert({
      where: { code: 'FRM_BARAIL' },
      update: {},
      create: {
        name: 'Barail Group',
        code: 'FRM_BARAIL',
        description: 'Oligocene sandstone-shale sequence — primary reservoir',
        ageEra: 'Oligocene',
        lithology: 'Sandstone, Shale, Coal streaks',
      },
    }),
    prisma.formation.upsert({
      where: { code: 'FRM_KOPILI' },
      update: {},
      create: {
        name: 'Kopili Formation',
        code: 'FRM_KOPILI',
        description: 'Eocene shale with fractured limestone — high mud loss risk',
        ageEra: 'Eocene',
        lithology: 'Shale, Fractured Limestone',
      },
    }),
    prisma.formation.upsert({
      where: { code: 'FRM_SYLHET' },
      update: {},
      create: {
        name: 'Sylhet Limestone',
        code: 'FRM_SYLHET',
        description: 'Eocene fractured limestone — vugular porosity, severe mud loss',
        ageEra: 'Eocene',
        lithology: 'Fractured Limestone, Dolomite',
      },
    }),
    prisma.formation.upsert({
      where: { code: 'FRM_JAINTIA' },
      update: {},
      create: {
        name: 'Jaintia Group',
        code: 'FRM_JAINTIA',
        description: 'Paleocene-Eocene basement — tight formation',
        ageEra: 'Paleocene-Eocene',
        lithology: 'Limestone, Shale, Sandstone',
      },
    }),
  ]);

  const [alluvium, tipam, girujan, barail, kopili, sylhet, jaintia] = formations;

  // ─── 2. WELLS ──────────────────────────────────────────────────────────────
  console.log('Creating wells...');

  // ACTIVE WELL
  const activeWell = await prisma.well.upsert({
    where: { wellId: 'OIL-NWIS-ACT-001' },
    update: { currentDepth: 2847, currentFormation: 'FRM_BARAIL' },
    create: {
      wellId: 'OIL-NWIS-ACT-001',
      wellName: 'Duliajan-NWIS-01',
      field: 'Duliajan',
      block: 'Block-A',
      latitude: 27.3714,
      longitude: 95.3250,
      spudDate: new Date('2026-07-15'),
      currentDepth: 2847,
      totalDepth: 3800,
      status: 'DRILLING',
      operator: 'Oil India Limited',
      wellType: 'VERTICAL',
      isActive: true,
      targetFormation: 'FRM_BARAIL',
      currentFormation: 'FRM_BARAIL',
    },
  });

  // HISTORICAL OFFSET WELLS
  const hw1 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-DUL-001' },
    update: {},
    create: {
      wellId: 'OIL-HW-DUL-001',
      wellName: 'Duliajan-HW-01',
      field: 'Duliajan',
      block: 'Block-A',
      latitude: 27.3820,
      longitude: 95.3310,
      spudDate: new Date('2021-03-10'),
      completionDate: new Date('2021-11-22'),
      currentDepth: 3480,
      totalDepth: 3480,
      status: 'COMPLETED',
      operator: 'Oil India Limited',
      wellType: 'VERTICAL',
      targetFormation: 'FRM_BARAIL',
      currentFormation: 'FRM_JAINTIA',
    },
  });

  const hw2 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-DUL-002' },
    update: {},
    create: {
      wellId: 'OIL-HW-DUL-002',
      wellName: 'Duliajan-HW-02',
      field: 'Duliajan',
      block: 'Block-A',
      latitude: 27.3590,
      longitude: 95.3180,
      spudDate: new Date('2022-01-05'),
      completionDate: new Date('2022-09-18'),
      currentDepth: 3650,
      totalDepth: 3650,
      status: 'COMPLETED',
      operator: 'Oil India Limited',
      wellType: 'VERTICAL',
      targetFormation: 'FRM_KOPILI',
      currentFormation: 'FRM_SYLHET',
    },
  });

  const hw3 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-DUL-003' },
    update: {},
    create: {
      wellId: 'OIL-HW-DUL-003',
      wellName: 'Duliajan-HW-03',
      field: 'Duliajan',
      block: 'Block-B',
      latitude: 27.3900,
      longitude: 95.3050,
      spudDate: new Date('2023-04-20'),
      completionDate: new Date('2024-01-08'),
      currentDepth: 3320,
      totalDepth: 3320,
      status: 'COMPLETED',
      operator: 'Oil India Limited',
      wellType: 'DIRECTIONAL',
      targetFormation: 'FRM_BARAIL',
      currentFormation: 'FRM_BARAIL',
    },
  });

  const hw4 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-DUL-004' },
    update: {},
    create: {
      wellId: 'OIL-HW-DUL-004',
      wellName: 'Duliajan-HW-04',
      field: 'Duliajan',
      block: 'Block-B',
      latitude: 27.3650,
      longitude: 95.3400,
      spudDate: new Date('2020-08-12'),
      completionDate: new Date('2021-05-30'),
      currentDepth: 3100,
      totalDepth: 3100,
      status: 'COMPLETED',
      operator: 'Oil India Limited',
      wellType: 'VERTICAL',
      targetFormation: 'FRM_BARAIL',
      currentFormation: 'FRM_KOPILI',
    },
  });

  const hw5 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-NAH-001' },
    update: {},
    create: {
      wellId: 'OIL-HW-NAH-001',
      wellName: 'Nahorkatia-HW-01',
      field: 'Nahorkatia',
      block: 'Block-C',
      latitude: 27.4120,
      longitude: 95.3500,
      spudDate: new Date('2019-11-01'),
      completionDate: new Date('2020-07-15'),
      currentDepth: 2950,
      totalDepth: 2950,
      status: 'COMPLETED',
      operator: 'Oil India Limited',
      wellType: 'VERTICAL',
      targetFormation: 'FRM_BARAIL',
      currentFormation: 'FRM_BARAIL',
    },
  });

  const hw6 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-NAH-002' },
    update: {},
    create: {
      wellId: 'OIL-HW-NAH-002',
      wellName: 'Nahorkatia-HW-02',
      field: 'Nahorkatia',
      block: 'Block-C',
      latitude: 27.4200,
      longitude: 95.3620,
      spudDate: new Date('2024-02-15'),
      currentDepth: 1850,
      totalDepth: 3200,
      status: 'DRILLING',
      operator: 'Oil India Limited',
      wellType: 'DIRECTIONAL',
      targetFormation: 'FRM_BARAIL',
      currentFormation: 'FRM_GIRUJAN',
    },
  });

  const hw7 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-MOR-001' },
    update: {},
    create: {
      wellId: 'OIL-HW-MOR-001',
      wellName: 'Moran-HW-01',
      field: 'Moran',
      block: 'Block-D',
      latitude: 27.3480,
      longitude: 95.2900,
      spudDate: new Date('2018-06-20'),
      completionDate: new Date('2019-02-14'),
      currentDepth: 4100,
      totalDepth: 4100,
      status: 'COMPLETED',
      operator: 'Oil India Limited',
      wellType: 'VERTICAL',
      targetFormation: 'FRM_SYLHET',
      currentFormation: 'FRM_JAINTIA',
    },
  });

  const hw8 = await prisma.well.upsert({
    where: { wellId: 'OIL-HW-MOR-002' },
    update: {},
    create: {
      wellId: 'OIL-HW-MOR-002',
      wellName: 'Moran-HW-02',
      field: 'Moran',
      block: 'Block-D',
      latitude: 27.3380,
      longitude: 95.2980,
      spudDate: new Date('2022-09-10'),
      completionDate: new Date('2023-06-28'),
      currentDepth: 3780,
      totalDepth: 3780,
      status: 'COMPLETED',
      operator: 'Oil India Limited',
      wellType: 'HORIZONTAL',
      targetFormation: 'FRM_BARAIL',
      currentFormation: 'FRM_BARAIL',
    },
  });

  // ─── 3. WELL-FORMATION ASSOCIATIONS ────────────────────────────────────────
  console.log('Creating well-formation associations...');

  const wellFormationData = [
    // Active well
    { well: activeWell, formation: alluvium, top: 0, bottom: 380 },
    { well: activeWell, formation: tipam, top: 380, bottom: 1150 },
    { well: activeWell, formation: girujan, top: 1150, bottom: 1580 },
    { well: activeWell, formation: barail, top: 1580, bottom: 2847, isActive: true },
    // hw1
    { well: hw1, formation: alluvium, top: 0, bottom: 420 },
    { well: hw1, formation: tipam, top: 420, bottom: 1180 },
    { well: hw1, formation: girujan, top: 1180, bottom: 1620 },
    { well: hw1, formation: barail, top: 1620, bottom: 2950 },
    { well: hw1, formation: kopili, top: 2950, bottom: 3480 },
    // hw2
    { well: hw2, formation: alluvium, top: 0, bottom: 390 },
    { well: hw2, formation: tipam, top: 390, bottom: 1210 },
    { well: hw2, formation: girujan, top: 1210, bottom: 1640 },
    { well: hw2, formation: barail, top: 1640, bottom: 2900 },
    { well: hw2, formation: kopili, top: 2900, bottom: 3400 },
    { well: hw2, formation: sylhet, top: 3400, bottom: 3650 },
    // hw3
    { well: hw3, formation: alluvium, top: 0, bottom: 400 },
    { well: hw3, formation: tipam, top: 400, bottom: 1160 },
    { well: hw3, formation: barail, top: 1160, bottom: 3320 },
    // hw4
    { well: hw4, formation: alluvium, top: 0, bottom: 350 },
    { well: hw4, formation: tipam, top: 350, bottom: 1090 },
    { well: hw4, formation: barail, top: 1090, bottom: 2600 },
    { well: hw4, formation: kopili, top: 2600, bottom: 3100 },
    // hw5
    { well: hw5, formation: alluvium, top: 0, bottom: 400 },
    { well: hw5, formation: tipam, top: 400, bottom: 1100 },
    { well: hw5, formation: barail, top: 1100, bottom: 2950 },
    // hw7
    { well: hw7, formation: alluvium, top: 0, bottom: 450 },
    { well: hw7, formation: tipam, top: 450, bottom: 1300 },
    { well: hw7, formation: barail, top: 1300, bottom: 2800 },
    { well: hw7, formation: kopili, top: 2800, bottom: 3600 },
    { well: hw7, formation: sylhet, top: 3600, bottom: 3900 },
    { well: hw7, formation: jaintia, top: 3900, bottom: 4100 },
  ];

  for (const wf of wellFormationData) {
    await prisma.wellFormation.upsert({
      where: { wellId_formationId: { wellId: wf.well.id, formationId: wf.formation.id } },
      update: {},
      create: {
        wellId: wf.well.id,
        formationId: wf.formation.id,
        topDepth: wf.top,
        bottomDepth: wf.bottom,
        isActive: (wf as { isActive?: boolean }).isActive ?? false,
      },
    });
  }

  // ─── 4. HISTORICAL DOCUMENTS ───────────────────────────────────────────────
  console.log('Creating historical documents...');

  const doc1 = await prisma.historicalDocument.create({
    data: {
      wellId: hw1.id,
      title: 'Duliajan-HW-01 Post-Well Completion Report (DEMO)',
      documentType: 'COMPLETION_REPORT',
      status: 'PROCESSED',
      uploadedAt: new Date('2022-01-15'),
      processedAt: new Date('2022-01-16'),
    },
  });

  const doc2 = await prisma.historicalDocument.create({
    data: {
      wellId: hw2.id,
      title: 'Duliajan-HW-02 Final Drilling Report (DEMO)',
      documentType: 'WELL_REPORT',
      status: 'PROCESSED',
      uploadedAt: new Date('2022-10-05'),
      processedAt: new Date('2022-10-06'),
    },
  });

  const doc3 = await prisma.historicalDocument.create({
    data: {
      wellId: hw3.id,
      title: 'Duliajan-HW-03 Post-Well Analysis (DEMO)',
      documentType: 'POST_WELL_ANALYSIS',
      status: 'PROCESSED',
      uploadedAt: new Date('2024-02-12'),
      processedAt: new Date('2024-02-13'),
    },
  });

  const doc4 = await prisma.historicalDocument.create({
    data: {
      wellId: hw4.id,
      title: 'Duliajan-HW-04 Mud Log Report (DEMO)',
      documentType: 'MUD_LOG',
      status: 'PROCESSED',
      uploadedAt: new Date('2021-06-20'),
      processedAt: new Date('2021-06-21'),
    },
  });

  const doc5 = await prisma.historicalDocument.create({
    data: {
      title: 'Barail Formation Geological Survey Report (DEMO)',
      documentType: 'WELL_REPORT',
      status: 'PROCESSED',
      uploadedAt: new Date('2023-03-10'),
      processedAt: new Date('2023-03-11'),
    },
  });

  // Document extractions
  await prisma.documentExtraction.createMany({
    data: [
      {
        documentId: doc1.id,
        extractionType: 'EVENT',
        confidence: 0.88,
        rawText: 'Mud loss observed at 2640m in Barail Formation. Loss rate estimated at 7-9 m3/hr.',
        structuredData: JSON.stringify({ eventType: 'MUD_LOSS', depth: 2640, formation: 'Barail' }),
        aiProvider: 'DEMO_OCR',
      },
      {
        documentId: doc2.id,
        extractionType: 'EVENT',
        confidence: 0.85,
        rawText: 'Severe circulation loss at 3380m in Sylhet Limestone. Total loss of mud returns.',
        structuredData: JSON.stringify({ eventType: 'MUD_LOSS', depth: 3380, formation: 'Sylhet' }),
        aiProvider: 'DEMO_OCR',
      },
      {
        documentId: doc3.id,
        extractionType: 'LESSON_LEARNED',
        confidence: 0.92,
        rawText: 'Differential sticking observed when static time exceeded 8 hours in Barail Shale member.',
        structuredData: JSON.stringify({ lesson: 'Limit static time to 4hrs in Barail Shale' }),
        aiProvider: 'DEMO_OCR',
      },
    ],
  });

  // ─── 5. DRILLING EVENTS ────────────────────────────────────────────────────
  console.log('Creating drilling events...');

  await prisma.drillingEvent.createMany({
    data: [
      // HW-001 events
      {
        wellId: hw1.id,
        formationId: barail.id,
        sourceDocumentId: doc1.id,
        eventType: 'MUD_LOSS',
        depth: 2640,
        timestamp: new Date('2021-07-14T08:30:00Z'),
        severity: 'HIGH',
        description: 'Partial mud loss in Barail Formation — fractured sandstone interval',
        cause: 'Natural fractures in Barail sandstone, ECD exceeding fracture gradient',
        mitigation: 'Reduced flow rate to 800 L/min, spotted LCM pill (fine to medium nut shells)',
        outcome: 'Partial returns restored after 6 hours. Continued drilling with reduced MW.',
        duration: 6.0,
        nptHours: 6.0,
        mudLossRate: 8.5,
      },
      {
        wellId: hw1.id,
        formationId: barail.id,
        sourceDocumentId: doc1.id,
        eventType: 'STUCK_PIPE',
        depth: 2850,
        timestamp: new Date('2021-08-02T14:15:00Z'),
        severity: 'HIGH',
        description: 'Differential sticking in Barail shale member — pipe could not rotate',
        cause: 'High overbalance pressure differential in shale. Static time exceeded 10hrs.',
        mitigation: 'Applied 200L diesel/spotting fluid. Jar-down sequence activated.',
        outcome: 'Pipe freed after 4.5 hours. No fish left in hole.',
        duration: 4.5,
        nptHours: 4.5,
      },
      {
        wellId: hw1.id,
        formationId: kopili.id,
        eventType: 'OVERPRESSURE',
        depth: 3120,
        timestamp: new Date('2021-09-10T22:45:00Z'),
        severity: 'CRITICAL',
        description: 'Gas kick detected — pit gain of 2.1 m3. Well shut in immediately.',
        cause: 'Encountered abnormally pressured zone in Kopili. MW insufficient.',
        mitigation: 'Shut-in BOP. Driller\'s method kill. MW increased from 1.36 to 1.42 g/cc.',
        outcome: 'Well killed successfully. Continued drilling with new MW.',
        duration: 18.0,
        nptHours: 18.0,
      },
      // HW-002 events
      {
        wellId: hw2.id,
        formationId: barail.id,
        sourceDocumentId: doc2.id,
        eventType: 'TORQUE_SPIKE',
        depth: 2780,
        timestamp: new Date('2022-05-18T11:00:00Z'),
        severity: 'MEDIUM',
        description: 'Sudden torque spike — from 12 kN.m to 28 kN.m in under 2 minutes',
        cause: 'Formation washout causing balled BHA. Clay-rich shale in Barail.',
        mitigation: 'Reduced WOB, increased RPM, circulated for 30 minutes to clean hole.',
        outcome: 'Torque normalized. Continued with reduced WOB.',
        duration: 1.5,
        nptHours: 1.0,
      },
      {
        wellId: hw2.id,
        formationId: sylhet.id,
        sourceDocumentId: doc2.id,
        eventType: 'MUD_LOSS',
        depth: 3410,
        timestamp: new Date('2022-07-01T03:30:00Z'),
        severity: 'CRITICAL',
        description: 'Total circulation loss in Sylhet Limestone — complete loss of returns',
        cause: 'Vugular porosity in Sylhet Limestone. Natural karst features encountered.',
        mitigation: 'Blind drilling with water. Cement squeeze attempted twice.',
        outcome: 'Partial returns after 48hrs. Drilled to TD with blind drilling.',
        duration: 48.0,
        nptHours: 48.0,
        mudLossRate: 0, // total loss
      },
      {
        wellId: hw2.id,
        formationId: kopili.id,
        eventType: 'CEMENTING_ISSUE',
        depth: 2920,
        timestamp: new Date('2022-07-20T16:00:00Z'),
        severity: 'HIGH',
        description: 'Poor cement bond log — channeling observed in Kopili section',
        cause: 'Mud cake not adequately removed before cementing. Poor centralization.',
        mitigation: 'Remedial squeeze cementing performed. Cement re-evaluated by CBL.',
        outcome: 'Satisfactory bond achieved after squeeze. Casing integrity confirmed.',
        duration: 24.0,
        nptHours: 24.0,
      },
      // HW-003 events
      {
        wellId: hw3.id,
        formationId: barail.id,
        sourceDocumentId: doc3.id,
        eventType: 'STUCK_PIPE',
        depth: 2860,
        timestamp: new Date('2023-09-15T09:20:00Z'),
        severity: 'CRITICAL',
        description: 'Mechanical stuck pipe — tight hole encountered while POOH',
        cause: 'Wellbore collapse in Barail shale. MW too low for the shale section.',
        mitigation: 'Sidetrack required after pipe twist-off.',
        outcome: 'Fish left in hole. Sidetrack drilled successfully.',
        duration: 72.0,
        nptHours: 72.0,
      },
      {
        wellId: hw3.id,
        formationId: barail.id,
        eventType: 'MUD_LOSS',
        depth: 2430,
        timestamp: new Date('2023-08-10T14:00:00Z'),
        severity: 'MEDIUM',
        description: 'Seepage mud loss — gradual loss of 3-5 m3/hr',
        cause: 'Natural micro-fractures in Barail sandstone',
        mitigation: 'LCM treatment (fine material). Mud weight adjusted.',
        outcome: 'Loss reduced to <1 m3/hr. Drilling continued.',
        duration: 4.0,
        nptHours: 2.0,
        mudLossRate: 4.0,
      },
      // HW-004 events
      {
        wellId: hw4.id,
        formationId: kopili.id,
        sourceDocumentId: doc4.id,
        eventType: 'OVERPRESSURE',
        depth: 2750,
        timestamp: new Date('2021-01-22T18:00:00Z'),
        severity: 'HIGH',
        description: 'Kick while drilling — 1.8 m3 gas influx from Kopili',
        cause: 'Encountering abnormal pore pressure zone. D-exponent decrease missed.',
        mitigation: 'Well shut-in. Wait and weight kill method. MW raised to 1.44 g/cc.',
        outcome: 'Kill successful. No surface equipment damage.',
        duration: 14.0,
        nptHours: 14.0,
      },
      {
        wellId: hw4.id,
        formationId: barail.id,
        eventType: 'TORQUE_SPIKE',
        depth: 1980,
        timestamp: new Date('2020-11-08T07:30:00Z'),
        severity: 'LOW',
        description: 'Minor torque fluctuation — likely formation change indication',
        cause: 'Transition from Barail sandstone to shale interbeds',
        mitigation: 'Reduced WOB, increased flow rate to clean hole',
        outcome: 'Torque stabilized. No further action required.',
        duration: 0.5,
        nptHours: 0,
      },
      // HW-005 events
      {
        wellId: hw5.id,
        formationId: barail.id,
        eventType: 'MUD_LOSS',
        depth: 2320,
        timestamp: new Date('2020-03-12T10:00:00Z'),
        severity: 'MEDIUM',
        description: 'Partial mud loss in Barail sandstone interval',
        cause: 'High permeability zone intersected. ECD too high.',
        mitigation: 'LCM — nut shells + graphite blend. Reduced ECD.',
        outcome: 'Full returns restored within 3 hours.',
        duration: 3.0,
        nptHours: 3.0,
        mudLossRate: 5.0,
      },
      // HW-007 events (Moran)
      {
        wellId: hw7.id,
        formationId: sylhet.id,
        eventType: 'MUD_LOSS',
        depth: 3680,
        timestamp: new Date('2018-11-20T01:00:00Z'),
        severity: 'CRITICAL',
        description: 'Catastrophic mud loss in Sylhet Limestone — 4000+ liters lost',
        cause: 'Large vugs in Sylhet Limestone. Complete communication with karst system.',
        mitigation: 'Cement + bentonite slurry. Multiple squeeze attempts.',
        outcome: 'Partially controlled. TD reached with intermittent losses.',
        duration: 120.0,
        nptHours: 96.0,
        mudLossRate: 0,
      },
      {
        wellId: hw7.id,
        formationId: kopili.id,
        eventType: 'OVERPRESSURE',
        depth: 3280,
        timestamp: new Date('2018-10-14T20:30:00Z'),
        severity: 'CRITICAL',
        description: 'High pressure gas kick — 4.2 m3 influx. Emergency BOP closure.',
        cause: 'Subnormal pore pressure transition to supernormal at Kopili/Sylhet boundary',
        mitigation: 'Emergency BOP closure. High-density kill fluid. MW to 1.52 g/cc.',
        outcome: 'Well killed. BOP test passed. Continued with higher MW.',
        duration: 36.0,
        nptHours: 36.0,
      },
      // HW-008 events
      {
        wellId: hw8.id,
        formationId: barail.id,
        eventType: 'CEMENTING_ISSUE',
        depth: 2200,
        timestamp: new Date('2023-02-14T09:00:00Z'),
        severity: 'MEDIUM',
        description: 'Short cement — TOC 200m above planned. CBL shows poor bond.',
        cause: 'Lost circulation during cementing. Cement fell back.',
        mitigation: 'Top-up job through drill pipe. Verified by temperature log.',
        outcome: 'Satisfactory isolation achieved.',
        duration: 16.0,
        nptHours: 16.0,
      },
    ],
  });

  // ─── 6. DRILLING PARAMETERS (Active Well) ──────────────────────────────────
  console.log('Creating drilling parameters for active well...');

  const now = new Date('2026-09-28T14:00:00Z');
  const paramData = [];

  // Generate 48 hours of hourly drilling parameters
  for (let i = 47; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * 3600000);
    const depth = 2800 + (47 - i) * 1.1; // ~1.1m per hour ROP
    const isAnomalous = i === 5 || i === 15; // simulate some anomalies

    paramData.push({
      wellId: activeWell.id,
      timestamp: ts,
      depth: Math.round(depth * 10) / 10,
      wob: isAnomalous ? 22.5 : 15 + Math.random() * 3,
      rpm: 80 + Math.random() * 10,
      torque: isAnomalous ? 26.8 : 12 + Math.random() * 4,
      rop: isAnomalous ? 1.2 : 3.5 + Math.random() * 2,
      mudWeight: 1.35 + Math.random() * 0.02,
      standpipePressure: isAnomalous ? 298 : 240 + Math.random() * 30,
      flowRate: 1050 + Math.random() * 50,
      hookLoad: 180 + Math.random() * 10,
      ecd: 1.42 + Math.random() * 0.02,
    });
  }

  await prisma.drillingParameter.createMany({ data: paramData });

  // ─── 7. RISK EVENTS ────────────────────────────────────────────────────────
  console.log('Creating risk events...');

  const risk1 = await prisma.riskEvent.create({
    data: {
      wellId: activeWell.id,
      formationId: barail.id,
      riskType: 'MUD_LOSS',
      depth: 2847,
      severity: 'HIGH',
      probability: 0.72,
      evidence: JSON.stringify([
        'OIL-HW-DUL-001: Mud loss at 2640m in Barail (8.5 m3/hr) — 207m away depth-wise',
        'OIL-HW-DUL-003: Mud loss at 2430m in Barail (4 m3/hr)',
        'OIL-HW-NAH-001: Mud loss at 2320m in Barail (5 m3/hr)',
        'Current ECD (1.44 g/cc) approaching estimated fracture gradient (1.46 g/cc)',
        'Barail Formation known to have natural fracture network in this field',
      ]),
      historicalRefs: JSON.stringify(['OIL-HW-DUL-001', 'OIL-HW-DUL-003', 'OIL-HW-NAH-001']),
      mitigation: 'Reduce MW by 0.02 g/cc, reduce flow rate, prepare LCM pill, monitor flow returns continuously',
      status: 'ACTIVE',
    },
  });

  const risk2 = await prisma.riskEvent.create({
    data: {
      wellId: activeWell.id,
      formationId: barail.id,
      riskType: 'STUCK_PIPE',
      depth: 2847,
      severity: 'HIGH',
      probability: 0.58,
      evidence: JSON.stringify([
        'OIL-HW-DUL-001: Stuck pipe at 2850m in Barail Shale (differential sticking)',
        'OIL-HW-DUL-003: Mechanical stuck at 2860m — fish left in hole',
        'Current depth (2847m) is within ±50m of both historical events',
        'Barail shale member is active at current depth',
        'High overbalance pressure differential detected (estimated 85 psi)',
      ]),
      historicalRefs: JSON.stringify(['OIL-HW-DUL-001', 'OIL-HW-DUL-003']),
      mitigation: 'Reduce static time, maintain minimum circulation, keep pipe in motion, have spotting fluid ready',
      status: 'ACTIVE',
    },
  });

  const risk3 = await prisma.riskEvent.create({
    data: {
      wellId: activeWell.id,
      formationId: barail.id,
      riskType: 'TORQUE_SPIKE',
      depth: 2847,
      severity: 'MEDIUM',
      probability: 0.41,
      evidence: JSON.stringify([
        'OIL-HW-DUL-002: Torque spike at 2780m (12→28 kN.m) in Barail',
        'Current torque reading at 18.4 kN.m — elevated but within limits',
        'Clay-rich shale interval in Barail known for BHA balling',
      ]),
      historicalRefs: JSON.stringify(['OIL-HW-DUL-002']),
      mitigation: 'Monitor torque continuously, clean hole at each stand, use anti-balling PDC bit features',
      status: 'MONITORING',
    },
  });

  // Future risks (approaching zones)
  await prisma.riskEvent.create({
    data: {
      wellId: activeWell.id,
      formationId: kopili.id,
      riskType: 'OVERPRESSURE',
      depth: 2950, // ~100m ahead of current depth
      severity: 'CRITICAL',
      probability: 0.65,
      evidence: JSON.stringify([
        'OIL-HW-DUL-001: Gas kick at 3120m in Kopili (MW insufficient)',
        'OIL-HW-DUL-004: Kick at 2750m — Kopili entry (1.8 m3 influx)',
        'Active well approaching Kopili entry at ~2950m (current: 2847m)',
        'Pore pressure gradient increases sharply at Barail/Kopili boundary',
        'D-exponent trending downward in last 80m — early overpressure indicator',
      ]),
      historicalRefs: JSON.stringify(['OIL-HW-DUL-001', 'OIL-HW-DUL-004', 'OIL-HW-MOR-001']),
      mitigation: 'Increase MW to 1.38 g/cc before entering Kopili. Verify BOP tested. Monitor D-exponent.',
      status: 'ACTIVE',
    },
  });

  // ─── 8. ALERTS ─────────────────────────────────────────────────────────────
  console.log('Creating alerts...');

  await prisma.alert.createMany({
    data: [
      {
        wellId: activeWell.id,
        riskEventId: risk1.id,
        alertType: 'PREDICTIVE',
        severity: 'HIGH',
        depth: 2847,
        formation: 'Barail Group',
        message: '⚠️ HIGH MUD LOSS RISK: Current depth in Barail Formation matches 3 historical mud loss events in offset wells within 15km radius. Probability: 72%.',
        evidence: JSON.stringify([
          'OIL-HW-DUL-001 @ 2640m: Mud loss 8.5 m3/hr',
          'OIL-HW-DUL-003 @ 2430m: Mud loss 4 m3/hr',
          'OIL-HW-NAH-001 @ 2320m: Mud loss 5 m3/hr',
        ]),
        recommendedAction: 'Prepare LCM pill (fine-medium blend). Reduce MW by 0.02 g/cc. Monitor flow returns with 5-min interval pit readings.',
        status: 'ACTIVE',
      },
      {
        wellId: activeWell.id,
        riskEventId: risk2.id,
        alertType: 'PREDICTIVE',
        severity: 'HIGH',
        depth: 2847,
        formation: 'Barail Group',
        message: '⚠️ STUCK PIPE RISK: 2 offset wells had stuck pipe at 2850m ±50m in Barail Shale. Avoid extended static time at current depth.',
        evidence: JSON.stringify([
          'OIL-HW-DUL-001 @ 2850m: Differential sticking (4.5hr NPT)',
          'OIL-HW-DUL-003 @ 2860m: Mechanical stuck (72hr NPT, fish left in hole)',
        ]),
        recommendedAction: 'Limit static time to <4hrs. Maintain minimum circulation 2 m3/min. Have 200L spotting fluid pre-mixed.',
        status: 'ACTIVE',
      },
      {
        wellId: activeWell.id,
        alertType: 'PREDICTIVE',
        severity: 'CRITICAL',
        depth: 2950,
        formation: 'Kopili Formation',
        message: '🔴 CRITICAL: Approaching Kopili Formation entry (~103m ahead). Historical data shows HIGH overpressure risk. 3 offset wells had kicks at Kopili entry. Verify mud weight program NOW.',
        evidence: JSON.stringify([
          'OIL-HW-DUL-001 @ 3120m: Gas kick (2.1 m3), MW increased to 1.42',
          'OIL-HW-DUL-004 @ 2750m: Gas kick (1.8 m3)',
          'OIL-HW-MOR-001 @ 3280m: Critical kick (4.2 m3), emergency BOP closure',
        ]),
        recommendedAction: 'Increase MW to 1.38 g/cc before 2950m. Test BOP. Establish pit monitoring. Confirm kill fluid on standby.',
        status: 'ACTIVE',
      },
      {
        wellId: activeWell.id,
        riskEventId: risk3.id,
        alertType: 'THRESHOLD',
        severity: 'WARNING',
        depth: 2847,
        formation: 'Barail Group',
        message: 'ℹ️ ELEVATED TORQUE: Current torque (18.4 kN.m) is 35% above baseline. Monitor for BHA balling. Offset wells show similar pattern precedes stuck pipe.',
        evidence: JSON.stringify([
          'OIL-HW-DUL-002 @ 2780m: Torque spike 12→28 kN.m (clay balling)',
          'Current torque: 18.4 kN.m (baseline: 13.6 kN.m)',
        ]),
        recommendedAction: 'Reduce WOB by 2t. Increase RPM to 90. Circulate bottom-up if torque exceeds 22 kN.m.',
        status: 'ACTIVE',
      },
      {
        wellId: activeWell.id,
        alertType: 'REALTIME',
        severity: 'WARNING',
        depth: 2847,
        formation: 'Barail Group',
        message: 'ℹ️ STANDPIPE PRESSURE: Current SPP (287 bar) is 12% above 24-hour average. Possible partial blockage or formation pressure increase.',
        recommendedAction: 'Check swab/surge pressures. Monitor ECD. If trend continues, investigate plugging.',
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date('2026-09-28T12:00:00Z'),
      },
    ],
  });

  // ─── 9. RECOMMENDATIONS ────────────────────────────────────────────────────
  console.log('Creating AI recommendations...');

  await prisma.recommendation.createMany({
    data: [
      {
        wellId: activeWell.id,
        category: 'MUD_PROGRAM',
        priority: 'HIGH',
        title: 'Pre-emptive LCM Treatment Before Barail Fractured Zone',
        content: 'Based on analysis of 5 offset wells in Duliajan-Nahorkatia field, the Barail Formation between 2800m-3000m has a consistent fractured sandstone interval. Recommended LCM blend: (1) 40% medium nut shells (3-5mm), (2) 30% fine fibers (cellophane flakes), (3) 20% graphite flakes, (4) 10% calcium carbonate (fine). Mix at 25 kg/m3 concentration.',
        rationale: 'OIL-HW-DUL-001 (2640m), OIL-HW-DUL-003 (2430m), and OIL-HW-NAH-001 (2320m) all experienced mud loss in this interval. Early LCM treatment reduced NPT by 65% in OIL-HW-DUL-003 compared to reactive treatment.',
        references: JSON.stringify(['OIL-HW-DUL-001', 'OIL-HW-DUL-003', 'OIL-HW-NAH-001']),
        aiProvider: 'DEMO',
        confidence: 0.81,
        status: 'PENDING',
      },
      {
        wellId: activeWell.id,
        category: 'WEIGHT_PROGRAM',
        priority: 'CRITICAL',
        title: 'Mud Weight Increase Protocol for Kopili Entry',
        content: 'Historical data from 4 offset wells consistently shows abnormal pore pressure at Kopili Formation entry (est. 2950-3050m in this well). Recommended MW increase schedule: (1) At 2900m: Begin monitoring D-exponent and Sigma plots, (2) At 2920m: Increase MW from 1.35 to 1.37 g/cc, (3) At 2940m: Increase to 1.39 g/cc if D-exponent continues declining, (4) At 2950m: Final MW check before Kopili entry — minimum 1.38 g/cc required.',
        rationale: 'All 4 wells that had kicks at Kopili entry (OIL-HW-DUL-001, OIL-HW-DUL-004, OIL-HW-MOR-001) were drilling with MW below 1.36 g/cc. Post-kick analysis showed pore pressure gradient of 1.38-1.41 g/cc equivalent.',
        references: JSON.stringify(['OIL-HW-DUL-001', 'OIL-HW-DUL-004', 'OIL-HW-MOR-001']),
        aiProvider: 'DEMO',
        confidence: 0.87,
        status: 'PENDING',
      },
      {
        wellId: activeWell.id,
        category: 'GENERAL',
        priority: 'HIGH',
        title: 'Static Time Management — Stuck Pipe Prevention',
        content: 'Strict static time protocol required in Barail Shale member (current depth). Actions: (1) Maximum static time: 4 hours without pipe movement, (2) Circulate and rotate every 3.5 hours when stationary, (3) Pre-mix 300L diesel-based spotting fluid and maintain on standby, (4) If torque/drag exceeds 15% of rotating values, initiate wiper trip, (5) Perform full wiper trip before any logging or casing run.',
        rationale: 'OIL-HW-DUL-001: Differential sticking after 10hrs static. OIL-HW-DUL-003: Mechanical stuck requiring sidetrack (72hr NPT). Both events occurred in Barail Shale at similar depth range.',
        references: JSON.stringify(['OIL-HW-DUL-001', 'OIL-HW-DUL-003']),
        aiProvider: 'DEMO',
        confidence: 0.79,
        status: 'REVIEWED',
      },
      {
        wellId: activeWell.id,
        category: 'BIT_SELECTION',
        priority: 'MEDIUM',
        title: 'PDC Bit Specification for Barail-Kopili Transition',
        content: 'For the upcoming Barail-Kopili transition section, recommend switching from current tri-cone bit to PDC with: (1) 5-blade, 8.5" PDC with enhanced gauge protection, (2) Anti-balling coating on blades, (3) Aggressive backrake angle (15-18°) for shale intervals, (4) Conservative cutter density through limestone. Alternative: RSS BHA if directional control required.',
        rationale: 'OIL-HW-DUL-002 used tri-cone through Barail-Kopili transition and experienced significant torque oscillation attributed to bit balling. OIL-HW-DUL-003 switched to PDC and completed similar interval with 40% better ROP.',
        references: JSON.stringify(['OIL-HW-DUL-002', 'OIL-HW-DUL-003']),
        aiProvider: 'DEMO',
        confidence: 0.74,
        status: 'PENDING',
      },
    ],
  });

  // ─── 10. KNOWLEDGE REPOSITORY ──────────────────────────────────────────────
  console.log('Creating knowledge repository entries...');

  await prisma.knowledgeEntry.createMany({
    data: [
      {
        title: 'Barail Formation — Mud Loss Management Protocol',
        category: 'BEST_PRACTICE',
        content: 'The Barail Group (Oligocene) in the Assam-Arakan basin exhibits a bimodal fracture network: (1) Primary fractures aligned NE-SW (regional stress field) and (2) Secondary fractures from compressional fold axes. Mud loss is most common in the 2400m-3000m interval where natural fracture density is highest. Best practice: (a) Drill with ECD <1.43 g/cc, (b) Pre-treat with 15 kg/m3 LCM before entering fracture-prone zones, (c) Conduct daily pit volume trending, (d) Keep two batch-mixed LCM pills on surface at all times.',
        tags: JSON.stringify(['mud-loss', 'Barail', 'LCM', 'fractures']),
        wellRef: 'OIL-HW-DUL-001',
        depthRef: 2640,
        formationRef: 'Barail Group',
        author: 'Operations Team — Duliajan',
        verified: true,
      },
      {
        title: 'Differential Sticking Prevention in Barail Shale',
        category: 'LESSON_LEARNED',
        content: 'Barail Shale (interbedded within Barail Sandstone) is highly reactive to WBM due to montmorillonite clay content (~35%). Key lessons: (1) Maximum static time 4hrs in Barail Shale. (2) Maintain high-quality mud with HPHT filtrate <4mL. (3) Use OBM or high-performance WBM with inhibitors (KCl + PHPA + glycol system). (4) Spotting fluid: 200L diesel with 15% lubricant (Lubozol or equivalent) prepared before entering shale. (5) Jar placement: 3-5 drill collars above expected stuck point. Historical data: 100% of stuck pipe events in Barail Shale were related to clay swelling when using standard WBM.',
        tags: JSON.stringify(['stuck-pipe', 'Barail', 'shale', 'clay-swelling', 'spotting-fluid']),
        wellRef: 'OIL-HW-DUL-003',
        depthRef: 2860,
        formationRef: 'Barail Group',
        author: 'Drilling Engineering — OIL HQ',
        verified: true,
      },
      {
        title: 'Kopili Formation Overpressure Detection and Kill Procedures',
        category: 'LESSON_LEARNED',
        content: 'The Kopili Formation shows consistent geopressure anomaly across the Duliajan-Moran fields. Entry typically occurs between 2600-3200m TVD. Kick indicators observed in all 4 wells before kick: (1) D-exponent decline 100-150m before kick, (2) Background gas increase (from <500ppm to >2000ppm over 80m), (3) Flow-check positive before confirmed kick. Kill method preference: Driller\'s method preferred for gas kicks (fast). Engineer\'s method (wait and weight) for oil/water kicks. Required MW increase at entry: +0.02 to +0.06 g/cc above pre-Kopili weight.',
        tags: JSON.stringify(['overpressure', 'kick', 'Kopili', 'geopressure', 'kill-procedure']),
        wellRef: 'OIL-HW-DUL-004',
        depthRef: 2750,
        formationRef: 'Kopili Formation',
        author: 'Well Control Specialist — OIL',
        verified: true,
      },
      {
        title: 'Sylhet Limestone — Total Circulation Loss Management',
        category: 'BEST_PRACTICE',
        content: 'Sylhet Limestone is a karst-modified formation with vugular porosity exceeding 30% in some intervals. Total circulation loss should be anticipated when drilling. Sequence: (1) Pre-plan for blind drilling with water. (2) Prepare cement-bentonite squeeze mix (350 kg cement + 150 kg bentonite per m3). (3) Use caliper log correlation to identify major vug zones. (4) Consider coiled tubing deployment for squeeze operations. (5) Monitor hole trajectory carefully during blind drilling to avoid sidetracking into lost zone. Historical NPT: 48-120 hours for total loss management in Sylhet.',
        tags: JSON.stringify(['mud-loss', 'Sylhet', 'blind-drilling', 'karst', 'limestone']),
        wellRef: 'OIL-HW-DUL-002',
        depthRef: 3410,
        formationRef: 'Sylhet Limestone',
        author: 'Mud Engineering Group — OIL',
        verified: true,
      },
      {
        title: 'Cement Bond Quality — Kopili Section Cementing Protocol',
        category: 'BEST_PRACTICE',
        content: 'CBL failures in Kopili have been traced to (1) poor mud cake removal and (2) inadequate centralizer spacing. Corrective protocol: (1) Spacer volume minimum 2x annular volume, (2) Turbulent flow displacement throughout cementing, (3) Centralizer spacing max 60ft in deviated sections, max 90ft in vertical, (4) Cement slurry design: 1.85 g/cc lead + 1.98 g/cc tail with microsilica for temperature stability, (5) Mandatory foam cement for low-gradient Kopili intervals to prevent U-tube issues.',
        tags: JSON.stringify(['cementing', 'Kopili', 'CBL', 'centralizers', 'bond']),
        wellRef: 'OIL-HW-DUL-002',
        depthRef: 2920,
        formationRef: 'Kopili Formation',
        author: 'Cementing Engineering — OIL',
        verified: true,
      },
      {
        title: 'ECD Management in Fractured Formations',
        category: 'BEST_PRACTICE',
        content: 'ECD management is critical across all fractured intervals in the Assam-Arakan basin. General guideline: (1) Calculate fracture gradient at each casing point using offset well data, (2) Keep ECD margin >0.02 g/cc below fracture gradient, (3) Optimize annular velocity to maintain hole cleaning while minimizing ECD, (4) Use rotating head for managed pressure drilling if ECD window narrows below 0.02 g/cc, (5) MPD consideration should be made before spud when formation tops are within 0.03 g/cc window.',
        tags: JSON.stringify(['ECD', 'fracture-gradient', 'MPD', 'pressure-management']),
        formationRef: 'Multiple',
        author: 'Drilling Engineering — OIL HQ',
        verified: true,
      },
      {
        title: 'D-Exponent Monitoring — Early Warning System for Overpressure',
        category: 'MITIGATION',
        content: 'D-exponent (dc) provides early warning of formation pressure changes. When dc decreases: (1) Check for bit condition change (worn bit gives lower dc). (2) Confirm no dilution of mud weight. (3) If bit condition confirmed OK, increase MW by 0.01 g/cc increments. (4) Flow-check every stand when dc decline >5% over 50m. (5) Historical success rate of D-exponent early warning: 85% in Assam-Arakan fields. Key: monitor dc trend, not absolute values.',
        tags: JSON.stringify(['D-exponent', 'overpressure', 'monitoring', 'pore-pressure']),
        formationRef: 'Kopili Formation',
        author: 'Geology-Drilling Integration Team',
        verified: true,
      },
      {
        title: 'Torque and Drag Analysis — Barail Drilling Practice',
        category: 'BEST_PRACTICE',
        content: 'Torque spikes in Barail Formation indicate either: (a) BHA balling — clay packed between PDC cutters, or (b) Formation washout creating bridging. Diagnosis: (1) If torque high and ROP high → likely balling, (2) If torque high and ROP low → likely bridging or tight hole. Treatment: For balling: reduce WOB to 8t, increase RPM to 100, spot water pill (2 stands), For bridging: circulate bottom-up at 1.5x normal rate, pick up and back-ream 3 stands, reduce WOB.',
        tags: JSON.stringify(['torque', 'drag', 'BHA', 'Barail', 'balling']),
        wellRef: 'OIL-HW-DUL-002',
        depthRef: 2780,
        formationRef: 'Barail Group',
        author: 'Drilling Engineering — Duliajan',
        verified: false,
      },
    ],
  });

  // ─── 11. WELL COMPARISONS ──────────────────────────────────────────────────
  console.log('Creating well comparisons...');

  await prisma.wellComparison.createMany({
    data: [
      {
        activeWellId: activeWell.id,
        offsetWellId: hw1.id,
        similarityScore: 0.88,
        matchedFormations: JSON.stringify(['Barail Group', 'Kopili Formation']),
        notes: 'High similarity — same field, same target formations, similar TD',
      },
      {
        activeWellId: activeWell.id,
        offsetWellId: hw3.id,
        similarityScore: 0.82,
        matchedFormations: JSON.stringify(['Barail Group']),
        notes: 'Good match — directional well in Block-B, same primary formation',
      },
      {
        activeWellId: activeWell.id,
        offsetWellId: hw5.id,
        similarityScore: 0.74,
        matchedFormations: JSON.stringify(['Barail Group']),
        notes: 'Moderate match — Nahorkatia field, similar Barail depth',
      },
    ],
  });

  // ─── 12. RISK RULES ────────────────────────────────────────────────────────
  console.log('Creating risk rules...');

  await prisma.riskRule.createMany({
    data: [
      {
        name: 'Mud Loss — ECD Near Fracture Gradient',
        description: 'Alert when ECD is within 0.03 g/cc of estimated fracture gradient',
        riskType: 'MUD_LOSS',
        conditions: JSON.stringify({ parameter: 'ecd', operator: '>', threshold: 'fracture_gradient - 0.03' }),
        severity: 'HIGH',
      },
      {
        name: 'Overpressure — D-Exponent Decline',
        description: 'Alert when D-exponent decreases by >5% over 50m interval',
        riskType: 'OVERPRESSURE',
        conditions: JSON.stringify({ parameter: 'dExponent', operator: 'trend_decrease', threshold: 0.05, interval: 50 }),
        severity: 'HIGH',
      },
      {
        name: 'Stuck Pipe — Elevated Torque/Drag',
        description: 'Alert when torque exceeds 130% of rotating baseline',
        riskType: 'STUCK_PIPE',
        conditions: JSON.stringify({ parameter: 'torque', operator: '>', threshold: '1.3 * baseline_torque' }),
        severity: 'HIGH',
      },
      {
        name: 'Torque Spike — Sudden Increase',
        description: 'Alert when torque increases by >50% within 5 minutes',
        riskType: 'TORQUE_SPIKE',
        conditions: JSON.stringify({ parameter: 'torque', operator: 'rapid_increase', threshold: 0.5, timeWindow: 300 }),
        severity: 'MEDIUM',
      },
      {
        name: 'Overpressure — Standpipe Pressure Anomaly',
        description: 'Alert when SPP deviates >15% from trend',
        riskType: 'OVERPRESSURE',
        conditions: JSON.stringify({ parameter: 'standpipePressure', operator: 'trend_deviation', threshold: 0.15 }),
        severity: 'MEDIUM',
      },
    ],
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('📊 Summary:');
  console.log(`   • 7 formations`);
  console.log(`   • 9 wells (1 active + 8 historical)`);
  console.log(`   • 5 historical documents`);
  console.log(`   • 14 drilling events (mud loss, stuck pipe, overpressure, torque spike, cementing)`);
  console.log(`   • 48 drilling parameter records (active well)`);
  console.log(`   • 4 risk events`);
  console.log(`   • 5 alerts`);
  console.log(`   • 4 AI recommendations`);
  console.log(`   • 8 knowledge repository entries`);
  console.log(`   • 3 well comparisons`);
  console.log(`   • 5 risk rules`);
  console.log('\n⚠️  Reminder: All data is FICTIONAL / DEMO ONLY');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
