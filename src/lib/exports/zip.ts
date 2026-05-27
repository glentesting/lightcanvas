/**
 * Shared utilities for export ZIP packaging and XML generation.
 */

/**
 * Escape XML special characters in attribute values.
 */
export function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// CRC-32 (standard IEEE table-based)
// ---------------------------------------------------------------------------

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Minimal ZIP builder (store-only, no compression, no external deps)
// ---------------------------------------------------------------------------

export function createZip(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const entries: Array<{ name: Uint8Array; data: Uint8Array; offset: number }> = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  const encoder = new TextEncoder();

  // zip64 safety: check cumulative offset won't overflow 32-bit
  let runningSize = 0;
  for (const file of files) {
    if (file.data.length >= 0xFFFFFFFF) {
      throw new Error(`File too large for zip32: ${file.name} is ${file.data.length} bytes (max 4 GiB)`);
    }
    runningSize += 30 + encoder.encode(file.name).length + file.data.length;
    if (runningSize >= 0xFFFFFFFF) {
      throw new Error(`File too large for zip32: ${file.name} is ${file.data.length} bytes (max 4 GiB)`);
    }
  }

  // UTF-8 flag (bit 11 = 0x0800) — filenames are UTF-8 encoded via TextEncoder
  const UTF8_FLAG = 0x0800;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const fileCrc = crc32(file.data);

    // Local file header
    const header = new Uint8Array(30 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true); // signature
    hv.setUint16(4, 20, true); // version needed
    hv.setUint16(6, UTF8_FLAG, true); // flags — bit 11 signals UTF-8 filename
    hv.setUint16(8, 0, true); // compression (store)
    hv.setUint16(10, 0, true); // mod time
    hv.setUint16(12, 0, true); // mod date
    hv.setUint32(14, fileCrc, true); // crc32
    hv.setUint32(18, file.data.length, true); // compressed size
    hv.setUint32(22, file.data.length, true); // uncompressed size
    hv.setUint16(26, nameBytes.length, true); // name length
    hv.setUint16(28, 0, true); // extra length
    header.set(nameBytes, 30);

    entries.push({ name: nameBytes, data: file.data, offset });
    parts.push(header);
    parts.push(file.data);
    offset += header.length + file.data.length;
  }

  // Central directory
  const cdStart = offset;
  for (const entry of entries) {
    const cd = new Uint8Array(46 + entry.name.length);
    const cv = new DataView(cd.buffer);
    const entryCrc = crc32(entry.data);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, UTF8_FLAG, true); // flags — bit 11 signals UTF-8 filename
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, entryCrc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, entry.name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0x20, true);
    cv.setUint32(42, entry.offset, true);
    cd.set(entry.name, 46);
    parts.push(cd);
    offset += cd.length;
  }

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, offset - cdStart, true);
  ev.setUint32(16, cdStart, true);
  ev.setUint16(20, 0, true);
  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: "application/zip" });
}
