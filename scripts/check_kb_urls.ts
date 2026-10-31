import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IOMETE_CAPABILITIES } from '../src/data/capabilities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkAllKbUrls() {
  // Also keep public/iomete_capabilities.json in sync with src/data/capabilities.ts
  const publicJsonPath = path.resolve(__dirname, '../public/iomete_capabilities.json');
  fs.writeFileSync(publicJsonPath, JSON.stringify(IOMETE_CAPABILITIES, null, 2), 'utf-8');

  console.log(`Checking ${IOMETE_CAPABILITIES.length} KB URLs from IOMETE_CAPABILITIES...`);
  const brokenUrls: Array<{ id: string; url: string; reason: string }> = [];
  const validUrls: Array<{ id: string; url: string; status: number }> = [];

  for (const cap of IOMETE_CAPABILITIES) {
    try {
      const parsed = new URL(cap.docUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        brokenUrls.push({ id: cap.id, url: cap.docUrl, reason: 'Invalid protocol' });
        continue;
      }

      const res = await fetch(cap.docUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'FitLens-KB-Validator/1.0' }
      });

      if (res.ok) {
        validUrls.push({ id: cap.id, url: cap.docUrl, status: res.status });
        console.log(`[OK ${res.status}] ${cap.id} -> ${cap.docUrl}`);
      } else {
        brokenUrls.push({ id: cap.id, url: cap.docUrl, reason: `HTTP ${res.status}` });
        console.error(`[BROKEN ${res.status}] ${cap.id} -> ${cap.docUrl}`);
      }
    } catch (err: any) {
      brokenUrls.push({ id: cap.id, url: cap.docUrl, reason: err?.message || 'Fetch error' });
      console.error(`[BROKEN ERR] ${cap.id} -> ${cap.docUrl}: ${err?.message}`);
    }
  }

  console.log('\n--- KB URL Check Summary ---');
  console.log(`Total Checked: ${IOMETE_CAPABILITIES.length}`);
  console.log(`Resolved OK:   ${validUrls.length}`);
  console.log(`Broken URLs:   ${brokenUrls.length}`);

  if (brokenUrls.length > 0) {
    console.error('\nBroken URLs list:');
    brokenUrls.forEach(b => console.error(` - ${b.id}: ${b.url} (${b.reason})`));
    process.exit(1);
  }
}

checkAllKbUrls();
