import { copyFile, mkdir } from 'node:fs/promises';

// tsc consumes .d.ts inputs but does not copy them into its output directory.
const destination = new URL('../dist/generated/', import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(
  new URL('../src/generated/schema.d.ts', import.meta.url),
  new URL('schema.d.ts', destination),
);
