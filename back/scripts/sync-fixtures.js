/**
 * Copy the frontend's placeholder corpus into the backend seed folder.
 *
 * The frontend keeps its fixtures in `corpus-native-languages/data/corpus.js`
 * (ESM). The backend seed needs the same file inside its own package so Node
 * can import it as an ES module. Run this script whenever the fixtures change:
 *
 *   npm run db:sync-fixtures
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../corpus-native-languages/data/corpus.js");
const destination = resolve(here, "../prisma/seed-data.js");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

console.log(`Copied fixtures:\n  ${source}\n  -> ${destination}`);
