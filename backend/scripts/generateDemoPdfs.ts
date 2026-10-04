/**
 * Demo PDF Generator and Seeder
 * 
 * Generates 3 realistic fictional drilling PDFs clearly labelled "DEMO DATA":
 *   1. Stuck Pipe incident in Barail Group (Duliajan-HW-01)
 *   2. Mud Loss event in Kopili Formation (Duliajan-HW-02)
 *   3. Torque Spike & Drag anomaly in Barail Group (Duliajan-HW-03)
 * 
 * Saves PDFs to backend/uploads and registers/processes them in the database.
 */

import fs from 'fs';
import path from 'path';
import prisma from '../src/utils/prisma';
import { createSimplePdf } from '../src/utils/pdfGenerator';
import { documentIntelligenceService } from '../src/services/documentIntelligence.service';
import logger from '../src/utils/logger';

async function main() {
  logger.info('Generating realistic demo drilling PDFs...');

  const uploadsDir = path.join(__dirname, '../uploads');
  const demoFilesDir = path.join(__dirname, '../demo-files');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(demoFilesDir)) fs.mkdirSync(demoFilesDir, { recursive: true });

  // Find wells for linking
  const well1 = await prisma.well.findFirst({ where: { wellId: 'OIL-HW-001' } }) || await prisma.well.findFirst();
  const well2 = await prisma.well.findFirst({ where: { wellId: 'OIL-HW-002' } }) || well1;
  const well3 = await prisma.well.findFirst({ where: { wellId: 'OIL-HW-003' } }) || well1;

  const demoPdfs = [
    {
      fileName: 'DEMO_DATA_OIL_Duliajan_HW01_DDR_StuckPipe.pdf',
      title: 'DEMO DATA — Daily Drilling Report #42 (Stuck Pipe Incident)',
      documentType: 'DAILY_REPORT',
      wellId: well1?.id || null,
      wellName: well1?.wellName || 'Duliajan-HW-01',
      lines: [
        '=========================================================================',
        'DEMO DATA - OIL INDIA LIMITED | EASTERN REGION ASSET',
        'DAILY DRILLING REPORT #42 (OPERATIONS SUMMARY)',
        '=========================================================================',
        `Well: ${well1?.wellName || 'Duliajan-HW-01'} | Well ID: ${well1?.wellId || 'OIL-HW-001'} | Field: Duliajan`,
        'Spud Date: 12-JAN-2025 | Target TD: 3400m | Current Depth: 2850m',
        'Formation: Barail Group (Shale / Sandstone sequence)',
        '-------------------------------------------------------------------------',
        'DRILLING EVENT: STUCK PIPE at 2850m (Severity: HIGH)',
        'Description: Differential sticking in Barail shale member. Drill string could not rotate or POOH.',
        'Cause: High overbalance pressure against permeable sand lens with 45 minutes static time during directional survey.',
        'Mitigation: Spotted 150 bbl diesel/glycol spotting pill. Applied 15t overpull with hydraulic jar activation sequence.',
        'Outcome: String freed after 4.5 hours NPT. Circulated bottom-up clean before resuming rotary drilling.',
        'NPT Hours: 4.5',
        '-------------------------------------------------------------------------',
        'DRILLING PARAMETERS AT EVENT:',
        'WOB: 14 t | RPM: 60 | Torque: 22 kN.m | ROP: 4.2 m/hr',
        'MW: 1.38 g/cc | SPP: 240 bar | Flow Rate: 2200 L/min',
        '-------------------------------------------------------------------------',
        'LESSONS LEARNED: Limit static time to under 15 minutes when drilling Barail shale intervals with overbalance.',
        'BEST PRACTICE: Pre-mix 200L diesel spotting fluid prior to drilling lower Barail target section.',
        '=========================================================================',
      ],
    },
    {
      fileName: 'DEMO_DATA_OIL_Duliajan_HW02_WCR_MudLoss.pdf',
      title: 'DEMO DATA — Well Completion Report (Kopili Mud Loss Section)',
      documentType: 'COMPLETION_REPORT',
      wellId: well2?.id || null,
      wellName: well2?.wellName || 'Duliajan-HW-02',
      lines: [
        '=========================================================================',
        'DEMO DATA - OIL INDIA LIMITED | EXPLORATION & PRODUCTION',
        'WELL COMPLETION REPORT - GEOLOGICAL SECTION 8-1/2 INCH',
        '=========================================================================',
        `Well: ${well2?.wellName || 'Duliajan-HW-02'} | Well ID: ${well2?.wellId || 'OIL-HW-002'} | Field: Duliajan`,
        'Section: Kopili Formation (Fractured Limestone & Calcareous Siltstone)',
        'Depth Interval: 2350m - 2650m | Section Depth: 2420m',
        '-------------------------------------------------------------------------',
        'DRILLING EVENT: MUD LOSS at 2420m (Severity: HIGH)',
        'Description: Severe mud loss observed in Kopili Formation. Rate: 12 m3/hr into fractured zone.',
        'Cause: Natural micro-fractures in upper Kopili carbonate stringer coupled with excessive ECD during surge.',
        'Mitigation: Reduced flow rate from 2400 to 1800 L/min. Spotted coarse and medium nutshell LCM pill (50 bbl).',
        'Outcome: Full returns established after 2.0 hours. Resumed drilling with managed equivalent circulating density.',
        'NPT Hours: 2.0 | Mud Loss Rate: 12 m3/hr',
        '-------------------------------------------------------------------------',
        'DRILLING PARAMETERS AT EVENT:',
        'WOB: 12 t | RPM: 75 | Torque: 16 kN.m | ROP: 6.8 m/hr',
        'MW: 1.32 g/cc | SPP: 210 bar | Flow Rate: 1800 L/min',
        '-------------------------------------------------------------------------',
        'LESSONS LEARNED: Pre-treat drilling fluid with fine fiber LCM prior to penetrating Kopili limestone top.',
        'BEST PRACTICE: Stage mud weight reduction and monitor pit levels at 5-minute intervals in fractured zones.',
        '=========================================================================',
      ],
    },
    {
      fileName: 'DEMO_DATA_OIL_Duliajan_HW03_Anomaly_TorqueSpike.pdf',
      title: 'DEMO DATA — Drilling Anomaly Report (Torque Spike & Drag)',
      documentType: 'DRILLING_REPORT',
      wellId: well3?.id || null,
      wellName: well3?.wellName || 'Duliajan-HW-03',
      lines: [
        '=========================================================================',
        'DEMO DATA - OIL INDIA LIMITED | DRILLING OPERATIONS GROUP',
        'DRILLING ANOMALY REPORT - HIGH TORQUE & DRAG INVESTIGATION',
        '=========================================================================',
        `Well: ${well3?.wellName || 'Duliajan-HW-03'} | Well ID: ${well3?.wellId || 'OIL-HW-003'} | Field: Duliajan`,
        'Depth: 2780m | Formation: Barail Group (Interbedded Sand/Shale)',
        'Inclination: 28.4 degrees | Azimuth: 142 degrees',
        '-------------------------------------------------------------------------',
        'DRILLING EVENT: TORQUE SPIKE at 2780m (Severity: MEDIUM)',
        'Description: Sudden torque spike from 14 kN.m to 28.5 kN.m in under 3 minutes with erratic rotary stalling.',
        'Cause: Cuttings bed accumulation in 28-degree build section and localized micro-dogleg.',
        'Mitigation: Backed off WOB from 16t to 8t. Circulated high-viscosity pill sweep and performed back-reaming pass.',
        'Outcome: Hole cleaned effectively. Rotary torque stabilized at 15 kN.m; resumed drilling safely after 1.5 hrs NPT.',
        'NPT Hours: 1.5',
        '-------------------------------------------------------------------------',
        'DRILLING PARAMETERS AT EVENT:',
        'WOB: 16 t | RPM: 45 | Torque: 28.5 kN.m | ROP: 2.5 m/hr',
        'MW: 1.36 g/cc | SPP: 255 bar | Flow Rate: 2100 L/min',
        '-------------------------------------------------------------------------',
        'LESSONS LEARNED: Circulate high-viscosity hole cleaning sweep every stand when inclination exceeds 25 degrees.',
        'BEST PRACTICE: Limit rotary speed to 50 RPM and maintain reaming speed <10 m/hr in deviated Barail section.',
        '=========================================================================',
      ],
    },
  ];

  for (const item of demoPdfs) {
    const pdfBuffer = createSimplePdf({
      title: item.title,
      lines: item.lines,
    });

    // Write to demo-files and uploads
    const destUploadPath = path.join(uploadsDir, item.fileName);
    const destDemoPath = path.join(demoFilesDir, item.fileName);
    fs.writeFileSync(destUploadPath, pdfBuffer);
    fs.writeFileSync(destDemoPath, pdfBuffer);

    logger.info(`Saved PDF: ${item.fileName} (${pdfBuffer.length} bytes)`);

    // Check if document already exists in DB
    let doc = await prisma.historicalDocument.findFirst({
      where: { title: item.title },
    });

    if (!doc) {
      doc = await prisma.historicalDocument.create({
        data: {
          title: item.title,
          documentType: item.documentType,
          wellId: item.wellId,
          fileUrl: `/uploads/${item.fileName}`,
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          status: 'PENDING',
        },
      });
      logger.info(`Created HistoricalDocument record: ${doc.id}`);
    } else {
      // Update fileUrl if needed
      doc = await prisma.historicalDocument.update({
        where: { id: doc.id },
        data: {
          fileUrl: `/uploads/${item.fileName}`,
          fileSize: pdfBuffer.length,
        },
      });
    }

    // Process document through intelligence pipeline
    try {
      const result = await documentIntelligenceService.processDocument(doc.id);
      logger.info(
        `Processed demo document ${doc.title}: status=${result.status}, events=${result.createdEventsCount}, confidence=${result.confidence}`
      );
    } catch (procErr: any) {
      logger.error(`Error processing ${doc.id}: ${procErr.message}`);
    }
  }

  logger.info('Demo PDFs generation and seeding completed successfully!');
}

main()
  .catch((e) => {
    logger.error('Error in demo PDF generator: ' + e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
