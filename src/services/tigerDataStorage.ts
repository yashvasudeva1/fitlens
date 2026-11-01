import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { ProspectRecord } from '../types/analyzer';

const { Pool } = pg;

const ROOT_DIR = process.env.APP_ROOT || process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'prospects_db.json');

let pool: pg.Pool | null = null;
let isInitialized = false;

/**
 * Returns true if TigerData / PostgreSQL connection string is provided in environment.
 */
export function isTigerDataConfigured(): boolean {
  const url = process.env.TIGERDATA_DATABASE_URL || process.env.DATABASE_URL;
  return Boolean(url && url.trim().length > 0 && !url.includes('YOUR_TIGERDATA_URL'));
}

/**
 * Get or create the PostgreSQL connection pool.
 */
function getPool(): pg.Pool | null {
  if (!isTigerDataConfigured()) return null;
  if (pool) return pool;

  const rawConnectionString = (process.env.TIGERDATA_DATABASE_URL || process.env.DATABASE_URL)!.trim();

  // TigerData / Tiger Cloud enforces TLS/SSL.
  const isLocalhost = rawConnectionString.includes('localhost') || rawConnectionString.includes('127.0.0.1');

  // Strip query sslmode so explicit rejectUnauthorized: false is honored by pg driver
  const cleanConnectionString = rawConnectionString
    .replace(/[?&]sslmode=[^&]+/i, '')
    .replace(/\?$/, '');

  pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle TigerData PostgreSQL client:', err.message);
  });

  return pool;
}

/**
 * Initializes TigerData schema automatically if connected.
 */
export async function initTigerData(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;

  try {
    const client = await p.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS fitlens_prospects (
          id VARCHAR(255) PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL,
          industry VARCHAR(255),
          website_or_domain VARCHAR(255),
          data_scale VARCHAR(255),
          current_stack TEXT,
          compliance_posture VARCHAR(255),
          overall_score INTEGER,
          verdict_band VARCHAR(100),
          confidence_level VARCHAR(50),
          flourish_summary TEXT,
          primary_friction TEXT,
          target_persona VARCHAR(255),
          contact_name VARCHAR(255),
          contact_role VARCHAR(255),
          contact_email VARCHAR(255),
          outreach_status VARCHAR(100),
          priority_tier VARCHAR(100),
          rep_notes TEXT,
          next_action TEXT,
          follow_up_date VARCHAR(50),
          analyzed_by_models JSONB,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          markdown_content TEXT,
          raw_record JSONB NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_fitlens_prospects_updated_at 
          ON fitlens_prospects(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_fitlens_prospects_company 
          ON fitlens_prospects(company_name);
        CREATE INDEX IF NOT EXISTS idx_fitlens_prospects_status 
          ON fitlens_prospects(outreach_status);
      `);

      isInitialized = true;
      console.log('[OK] TigerData (Tiger Cloud PostgreSQL) connected and schema verified successfully.');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('TigerData initialization failed, will use local file fallback:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Local JSON File Fallback Helpers
// ---------------------------------------------------------------------------

function loadFileDatabase(): ProspectRecord[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as ProspectRecord[];
      }
    } catch {
      // Corrupt or empty JSON
    }
  }
  return [];
}

function saveFileDatabase(records: ProspectRecord[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Public Unified Storage Interface (TigerData with Auto File Fallback)
// ---------------------------------------------------------------------------

export async function fetchAllProspects(): Promise<ProspectRecord[]> {
  const p = getPool();
  if (p) {
    try {
      if (!isInitialized) await initTigerData();
      const res = await p.query(
        'SELECT raw_record FROM fitlens_prospects ORDER BY updated_at DESC'
      );
      return res.rows.map(r => r.raw_record as ProspectRecord);
    } catch (err: any) {
      console.error('Error fetching prospects from TigerData, falling back to local file:', err.message);
    }
  }
  return loadFileDatabase();
}

export async function saveOrUpdateProspect(record: ProspectRecord): Promise<ProspectRecord[]> {
  const p = getPool();
  if (p) {
    try {
      if (!isInitialized) await initTigerData();
      await p.query(
        `INSERT INTO fitlens_prospects (
          id, company_name, industry, website_or_domain, data_scale, current_stack,
          compliance_posture, overall_score, verdict_band, confidence_level,
          flourish_summary, primary_friction, target_persona, contact_name,
          contact_role, contact_email, outreach_status, priority_tier, rep_notes,
          next_action, follow_up_date, analyzed_by_models, updated_at,
          markdown_content, raw_record
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, NOW(), $23, $24
        )
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          industry = EXCLUDED.industry,
          website_or_domain = EXCLUDED.website_or_domain,
          data_scale = EXCLUDED.data_scale,
          current_stack = EXCLUDED.current_stack,
          compliance_posture = EXCLUDED.compliance_posture,
          overall_score = EXCLUDED.overall_score,
          verdict_band = EXCLUDED.verdict_band,
          confidence_level = EXCLUDED.confidence_level,
          flourish_summary = EXCLUDED.flourish_summary,
          primary_friction = EXCLUDED.primary_friction,
          target_persona = EXCLUDED.target_persona,
          contact_name = EXCLUDED.contact_name,
          contact_role = EXCLUDED.contact_role,
          contact_email = EXCLUDED.contact_email,
          outreach_status = EXCLUDED.outreach_status,
          priority_tier = EXCLUDED.priority_tier,
          rep_notes = EXCLUDED.rep_notes,
          next_action = EXCLUDED.next_action,
          follow_up_date = EXCLUDED.follow_up_date,
          analyzed_by_models = EXCLUDED.analyzed_by_models,
          updated_at = NOW(),
          markdown_content = EXCLUDED.markdown_content,
          raw_record = EXCLUDED.raw_record`,
        [
          record.id,
          record.companyName,
          record.industry,
          record.websiteOrDomain || null,
          record.dataScale,
          record.currentStack,
          record.compliancePosture,
          record.overallScore,
          record.verdictBand,
          record.confidenceLevel,
          record.flourishSummary,
          record.primaryFriction,
          record.targetPersona,
          record.contactName,
          record.contactRole,
          record.contactEmail,
          record.outreachStatus,
          record.priorityTier,
          record.repNotes,
          record.nextAction,
          record.followUpDate,
          JSON.stringify(record.analyzedByModels || []),
          record.markdownContent || null,
          JSON.stringify(record)
        ]
      );
      return await fetchAllProspects();
    } catch (err: any) {
      console.error('Error saving prospect to TigerData, saving to local file:', err.message);
    }
  }

  // File fallback
  const records = loadFileDatabase();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.unshift(record);
  }
  saveFileDatabase(records);
  return records;
}

export async function patchProspect(
  id: string,
  updates: Partial<ProspectRecord>
): Promise<{ updated: ProspectRecord | null; prospects: ProspectRecord[] }> {
  const p = getPool();
  if (p) {
    try {
      if (!isInitialized) await initTigerData();
      const existingRes = await p.query(
        'SELECT raw_record FROM fitlens_prospects WHERE id = $1',
        [id]
      );
      if (existingRes.rowCount && existingRes.rowCount > 0) {
        const merged: ProspectRecord = {
          ...(existingRes.rows[0].raw_record as ProspectRecord),
          ...updates,
          updatedAt: new Date().toISOString()
        };
        const all = await saveOrUpdateProspect(merged);
        return { updated: merged, prospects: all };
      }
    } catch (err: any) {
      console.error('Error patching prospect in TigerData, falling back to local file:', err.message);
    }
  }

  // File fallback
  const records = loadFileDatabase();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) {
    return { updated: null, prospects: records };
  }
  records[idx] = {
    ...records[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveFileDatabase(records);
  return { updated: records[idx], prospects: records };
}

export async function removeProspect(id: string): Promise<ProspectRecord[]> {
  const p = getPool();
  if (p) {
    try {
      if (!isInitialized) await initTigerData();
      await p.query('DELETE FROM fitlens_prospects WHERE id = $1', [id]);
      return await fetchAllProspects();
    } catch (err: any) {
      console.error('Error deleting prospect from TigerData, falling back to local file:', err.message);
    }
  }

  // File fallback
  const records = loadFileDatabase().filter(r => r.id !== id);
  saveFileDatabase(records);
  return records;
}

/**
 * Returns health and connection status for TigerData
 */
export async function getStorageHealth(): Promise<{
  backend: 'tigerdata' | 'local_file';
  connected: boolean;
  version?: string;
  error?: string;
}> {
  if (!isTigerDataConfigured()) {
    return {
      backend: 'local_file',
      connected: true
    };
  }

  const p = getPool();
  if (!p) {
    return {
      backend: 'tigerdata',
      connected: false,
      error: 'Failed to initialize PostgreSQL pool'
    };
  }

  try {
    const res = await p.query('SELECT version()');
    return {
      backend: 'tigerdata',
      connected: true,
      version: res.rows[0]?.version?.slice(0, 40)
    };
  } catch (err: any) {
    return {
      backend: 'tigerdata',
      connected: false,
      error: err.message
    };
  }
}
