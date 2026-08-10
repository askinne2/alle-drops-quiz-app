import { describe, it, expect, vi } from "vitest";
import {
  sniffType,
  isAllowedType,
  effectiveContentType,
  MIN_SNIFF_BYTES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_FILES,
} from "../app/lib/storage/upload-validation";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function bytesFromString(s: string): Uint8Array {
  return new Uint8Array(Array.from(s, (c) => c.charCodeAt(0)));
}

const PDF_SIG = bytes(0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0); // %PDF
const JPEG_SIG = bytes(0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const PNG_SIG = bytes(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0);

function heicSig(brand: string): Uint8Array {
  // bytes 0-3 arbitrary (box size), 4-7 "ftyp", 8-11 brand
  const header = bytes(0, 0, 0, 0x18);
  const ftyp = bytesFromString("ftyp");
  const brandBytes = bytesFromString(brand);
  const out = new Uint8Array(12);
  out.set(header, 0);
  out.set(ftyp, 4);
  out.set(brandBytes, 8);
  return out;
}

describe("sniffType", () => {
  it("recognizes a PDF signature", () => {
    expect(sniffType(PDF_SIG)).toBe("pdf");
  });

  it("recognizes a JPEG signature", () => {
    expect(sniffType(JPEG_SIG)).toBe("jpeg");
  });

  it("recognizes a PNG signature", () => {
    expect(sniffType(PNG_SIG)).toBe("png");
  });

  it("recognizes a HEIC signature with the 'heic' brand", () => {
    expect(sniffType(heicSig("heic"))).toBe("heic");
  });

  it("recognizes a HEIC signature with the 'mif1' brand", () => {
    expect(sniffType(heicSig("mif1"))).toBe("heic");
  });

  it("returns null for a spoofed file — ASCII text bytes named results.pdf", () => {
    // This is the test that proves Pitfall 1 is closed: the notional filename ("results.pdf") is
    // irrelevant to sniffType, which only ever inspects bytes.
    const asciiText = bytesFromString("This is just plain text, not a PDF at all.");
    expect(sniffType(asciiText)).toBeNull();
  });

  it("returns null for a 0-byte buffer without throwing", () => {
    expect(() => sniffType(bytes())).not.toThrow();
    expect(sniffType(bytes())).toBeNull();
  });

  it("returns null for a 3-byte buffer without throwing", () => {
    const buf = bytes(0xff, 0xd8, 0x00);
    expect(() => sniffType(buf)).not.toThrow();
    expect(sniffType(buf)).toBeNull();
  });

  it("returns null for an 11-byte buffer without throwing", () => {
    const buf = bytesFromString("ftypheic!!!").slice(0, 11); // 11 bytes, HEIC-shaped but truncated
    expect(() => sniffType(buf)).not.toThrow();
    expect(sniffType(buf)).toBeNull();
  });

  it("returns null for a PNG signature with a corrupted 4th byte", () => {
    const corrupted = bytes(0x89, 0x50, 0x4e, 0x00, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(sniffType(corrupted)).toBeNull();
  });

  it("returns null for null/undefined input without throwing", () => {
    expect(() => sniffType(null)).not.toThrow();
    expect(() => sniffType(undefined)).not.toThrow();
    expect(sniffType(null)).toBeNull();
    expect(sniffType(undefined)).toBeNull();
  });
});

describe("isAllowedType", () => {
  it("is false for null", () => {
    expect(isAllowedType(null)).toBe(false);
  });

  it("is true for all four allowed types", () => {
    expect(isAllowedType("pdf")).toBe(true);
    expect(isAllowedType("jpeg")).toBe(true);
    expect(isAllowedType("png")).toBe(true);
    expect(isAllowedType("heic")).toBe(true);
  });
});

describe("effectiveContentType", () => {
  it("maps each sniffed type to its stored content type", () => {
    expect(effectiveContentType("pdf")).toBe("application/pdf");
    expect(effectiveContentType("jpeg")).toBe("image/jpeg");
    expect(effectiveContentType("png")).toBe("image/png");
    expect(effectiveContentType("heic")).toBe("image/heic");
  });
});

describe("MIN_SNIFF_BYTES", () => {
  it("equals 12", () => {
    expect(MIN_SNIFF_BYTES).toBe(12);
  });
});

describe("ratified size-cap constants (04-UPLOAD-DECISIONS.md Section 4 item 4)", () => {
  it("MAX_FILE_BYTES equals 15 MB exactly", () => {
    expect(MAX_FILE_BYTES).toBe(15 * 1024 * 1024);
  });

  it("MAX_TOTAL_BYTES equals 50 MB exactly", () => {
    expect(MAX_TOTAL_BYTES).toBe(50 * 1024 * 1024);
  });

  it("MAX_FILES equals 10 exactly", () => {
    expect(MAX_FILES).toBe(10);
  });
});

// ── heic.ts — HEIC to JPEG conversion wrapper (Task 3) ──────────────────────────────────────
//
// Mock heic-convert rather than committing a real HEIC fixture — a real one is device-captured
// PHI-adjacent binary and does not belong in the repo. A real device-captured HEIC is exercised in
// plan 04-19's human pass.

vi.mock("heic-convert", () => ({
  default: vi.fn(),
}));

describe("heicBufferToJpeg", () => {
  it("returns { ok: false, reason } without throwing for a malformed HEIC buffer, and the reason contains no filename", async () => {
    vi.resetModules();
    const heicConvertModule = await import("heic-convert");
    const mockConvert = vi.mocked(heicConvertModule.default);
    mockConvert.mockRejectedValueOnce(new Error("unable to parse ftyp box"));

    const { heicBufferToJpeg } = await import("../app/lib/storage/heic");
    const malformed = Buffer.from([0x00, 0x01, 0x02, 0x03]);

    const result = await heicBufferToJpeg(malformed);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toMatch(/\.(heic|jpg|jpeg|png|pdf)/i);
      expect(result.reason).toBe("unable to parse ftyp box");
    }
  });

  it("returns a JPEG buffer beginning with the JPEG signature on success", async () => {
    vi.resetModules();
    const heicConvertModule = await import("heic-convert");
    const mockConvert = vi.mocked(heicConvertModule.default);
    const fakeJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]);
    mockConvert.mockResolvedValueOnce(fakeJpegBytes);

    const { heicBufferToJpeg } = await import("../app/lib/storage/heic");
    const input = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]); // arbitrary HEIC-shaped bytes

    const result = await heicBufferToJpeg(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.jpeg[0]).toBe(0xff);
      expect(result.jpeg[1]).toBe(0xd8);
      expect(result.jpeg[2]).toBe(0xff);
    }
  });
});
