# FitLens: IOMETE Account Fit Analyzer

FitLens is an enterprise architectural qualification and sales fit engine for IOMETE (Apache Spark and Apache Iceberg on Kubernetes across sovereign on-premise, cloud VPC, hybrid, and air-gapped environments).

The platform pairs Google Gemini multi-model intelligence (gemini-3.8-flash with Google Search Grounding, gemini-3.1-flash-lite, and gemini-3.8-flash-lite-tts) with a pure-code, deterministic 7-dimension evaluation rubric and a persistent prospect database backed by TigerData Cloud (Timescale PostgreSQL).

---

## Architecture Overview

FitLens is designed as a modular, low-latency, full-stack application:

- Frontend: React 19, Tailwind CSS v4, Lucide Icons, and Motion, bundled into static single-page application assets via Vite.
- Backend: Express on Node.js 22, bundled with esbuild into a standalone ECMAScript Module server (dist-server/server.js) for fast container boot times and minimal memory footprint.
- Database: Dual-mode persistence layer. Connects directly to TigerData (Tiger Cloud PostgreSQL) via connection pooling, with automatic schema creation and fallback to local file storage (data/prospects_db.json).
- Multi-Model AI Pipeline:
  - Stage 0: gemini-3.8-flash with Google Search Grounding for live research across engineering blogs, job postings, and regulatory disclosures.
  - Stage 1: gemini-3.1-flash-lite for structured extraction of stack, scale, workflows, team, and sovereignty constraints.
  - Stage 2: gemini-3.8-flash for grounded matching against the official 28 IOMETE capabilities.
  - Stage 3: Pure-code deterministic rubric computing transparent, reproducible scores (0-100), verdict bands, and evidence citations.
  - Stage 4: gemini-3.8-flash-lite-tts for voice briefing audio synthesis.

---

## Zero-Static Data Guarantee

FitLens operates with zero static or mock prospect records:

- The persistent prospect database (data/prospects_db.json or TigerData PostgreSQL table fitlens_prospects) initializes empty.
- No dummy accounts or pre-seeded companies exist in the production runtime.
- The input workspace loads in a clean state, enabling live research, template-driven drafting, or raw file upload.
- Evaluation benchmark datasets are reserved exclusively for offline automated validation scripts and tests.

---

## Getting Started

### Prerequisites

- Node.js 22 LTS or newer
- npm 10 or newer (or Docker for containerized execution)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yashvasudeva1/fitlens.git
   cd fitlens
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Populate your `.env` configuration:
   - GEMINI_API_KEY: Your Google AI Studio API key.
   - TIGERDATA_DATABASE_URL: Your TigerData / Timescale Cloud PostgreSQL connection string.
   - PORT: Default is 3000 or use 5000.
   - HOST: Default is 0.0.0.0.

### Running in Development

```bash
npm run dev
```

The development server runs Express with integrated Vite Hot Module Replacement at http://localhost:3000.

---

## Production Build

To compile both client assets and backend bundle for production:

```bash
npm run build
```

This command executes:
1. `vite build`: Compiles optimized React assets into `dist/`.
2. `esbuild server.ts`: Compiles the server and internal dependencies into a standalone bundle at `dist-server/server.js`.

To start the production server:

```bash
npm start
```

---

## Deployment on Vultr Cloud

FitLens is equipped with dedicated configuration files and automation scripts for deployment on Vultr Cloud Compute (VPS) or Vultr Container Engine.

Detailed instructions are documented in [VULTR_DEPLOYMENT.md](VULTR_DEPLOYMENT.md).

### Quick Deployment via Docker Compose

1. On your Vultr Ubuntu instance:
   ```bash
   cd /opt/fitlens
   docker compose up -d --build
   ```

2. Verify service health:
   ```bash
   curl http://localhost:3000/health
   ```

   Response:
   ```json
   {
     "status": "ok",
     "service": "fitlens",
     "database": {
       "backend": "tigerdata",
       "connected": true,
       "version": "PostgreSQL 18.6 (Ubuntu 18.6-1.pgdg22.04)"
     },
     "uptimeSeconds": 14,
     "timestamp": "2026-11-01T02:40:00.000Z"
   }
   ```

---

## Automated Scripts and Quality Verification

FitLens includes dedicated verification suites:

- `npm run lint`: Performs strict TypeScript compiler checks without emitting files.
- `npm run check:urls`: Validates that all 28 IOMETE capability documentation URLs resolve with HTTP 200.
- `npm run eval`: Executes the automated qualification rubric evaluation across benchmark matrices to verify repeatability, verdict agreement, and citation integrity.

---

## License

Private license and proprietary. Developed for FitLens IOMETE Account Fit Analyzer.
