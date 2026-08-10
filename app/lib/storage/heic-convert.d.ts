/**
 * `heic-convert` ships no TypeScript types and no `@types/heic-convert` package exists on the
 * registry. This ambient declaration covers only the subset of its CommonJS API this app uses
 * (the default export's single-image conversion). See node_modules/heic-convert/README.md for the
 * full surface (this file deliberately omits `.all`, which app/lib/storage/heic.ts does not use).
 */
declare module "heic-convert" {
  interface HeicConvertOptions {
    buffer: Buffer | Uint8Array;
    format: "JPEG" | "PNG";
    quality?: number;
  }

  function convert(options: HeicConvertOptions): Promise<Uint8Array>;

  export default convert;
}
