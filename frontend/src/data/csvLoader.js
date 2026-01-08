// Lightweight CSV loader + parser. Tries to fetch an asset URL and parse CSV text.
export async function loadCSVAsset(asset) {
  // asset expected to be a module (require('../assets/data/..')) or a string URL
  try {
    let url = asset;
    if (typeof asset === 'number') {
      // packager asset id - try to resolve via ImageStore-like behavior (may not work in all setups)
      // Best-effort: try to fetch asset via `asset` directly (Metro sometimes exposes a URI)
      // If this doesn't work, the caller should fallback to hardcoded lists.
      url = asset;
    }
    const resp = await fetch(url);
    const text = await resp.text();
    return parseCSV(text);
  } catch (err) {
    // fail gracefully
    console.warn('loadCSVAsset failed', err);
    return null;
  }
}

export function parseCSV(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    // simple CSV split, supports quoted fields
    const values = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        values.push(curr.trim());
        curr = '';
        continue;
      }
      curr += ch;
    }
    values.push(curr.trim());

    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = values[i] != null ? values[i] : '';
    }
    return obj;
  });
  return rows;
}
