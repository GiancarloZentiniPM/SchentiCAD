// ============================================================
// SchentiCAD EDZ Parser — ZIP Extraction (Browser)
// ============================================================
// EDZ files are ZIP archives containing XML symbol data.
// We use the browser's built-in DecompressionStream API
// or fall back to raw XML if the file isn't actually zipped.

import { parseEdzXml } from "./parser";
import type { EdzParseResult, EdzParserOptions } from "./types";

/**
 * Parse an EDZ file from an ArrayBuffer.
 * Attempts ZIP extraction first, falls back to raw XML.
 */
export async function parseEdzFile(
  buffer: ArrayBuffer,
  options: EdzParserOptions = {},
): Promise<EdzParseResult> {
  const bytes = new Uint8Array(buffer);

  // Check ZIP magic bytes (PK\x03\x04)
  const isZip = bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  if (isZip) {
    // Extract XML files from ZIP
    const xmlContent = await extractXmlFromZip(buffer);
    if (xmlContent) {
      return parseEdzXml(xmlContent, options);
    }
    return {
      symbols: [],
      metadata: { version: "", source: "edz", symbolCount: 0 },
      errors: ["Could not extract XML from ZIP archive"],
    };
  }

  // Try as raw XML
  const text = new TextDecoder("utf-8").decode(bytes);
  if (text.trim().startsWith("<")) {
    return parseEdzXml(text, options);
  }

  return {
    symbols: [],
    metadata: { version: "", source: "edz", symbolCount: 0 },
    errors: ["File is neither a valid ZIP archive nor XML"],
  };
}

/**
 * Simple ZIP extraction for finding XML files.
 * Uses local file header parsing to find and decompress entries.
 */
async function extractXmlFromZip(buffer: ArrayBuffer): Promise<string | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;
  const xmlParts: string[] = [];

  while (offset < bytes.length - 4) {
    // Look for local file header signature
    if (view.getUint32(offset, true) !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = bytes.slice(offset + 30, offset + 30 + nameLen);
    const fileName = new TextDecoder().decode(nameBytes);

    const dataOffset = offset + 30 + nameLen + extraLen;

    // Only process XML files
    if (fileName.toLowerCase().endsWith(".xml")) {
      const compressedData = bytes.slice(dataOffset, dataOffset + (compressedSize || uncompressedSize));

      if (compressionMethod === 0) {
        // Stored (no compression)
        xmlParts.push(new TextDecoder("utf-8").decode(compressedData));
      } else if (compressionMethod === 8) {
        // Deflate — use DecompressionStream if available
        try {
          const decompressed = await decompressDeflate(compressedData);
          xmlParts.push(new TextDecoder("utf-8").decode(decompressed));
        } catch {
          // Skip files we can't decompress
        }
      }
    }

    offset = dataOffset + (compressedSize || uncompressedSize);
  }

  if (xmlParts.length === 0) return null;

  // Combine all XML parts — wrap in root if multiple
  if (xmlParts.length === 1) return xmlParts[0];
  return `<SymbolLibrary>\n${xmlParts.join("\n")}\n</SymbolLibrary>`;
}

async function decompressDeflate(data: Uint8Array): Promise<Uint8Array> {
  // Use DecompressionStream API (modern browsers)
  if (typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(data);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.length;
    }
    return result;
  }

  throw new Error("DecompressionStream not available");
}
