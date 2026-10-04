# DrishtiWell — SIH 2026

AI-powered well intelligence and drilling decision support platform for historical well analysis, risk assessment, and proactive drilling recommendations.

## Overview
DrishtiWell (eRTMAC-NWIS) is a real-time well monitoring and historical offset well analysis system designed for upstream oil & gas drilling operations.

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma ORM (SQLite / PostgreSQL)
- **Features**:
  - Real-time Active Well telemetry monitoring & anomaly alerts
  - Offset well historical correlation & risk intelligence
  - Document intelligence & automated extraction from DDR/WCR reports
  - Proactive AI-driven drilling recommendations & SOP lookups
  - Geospatial well mapping & multi-well lithology comparison

## Getting Started

### Backend
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed       # Seeds demo wells, lithology, and historical incidents
npm run dev        # Starts backend API on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Starts frontend dev server on port 5173
```
