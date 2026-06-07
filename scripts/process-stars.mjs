import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const inputCandidates = [
  path.join(rootDir, "data", "hyg_v42.csv.gz"),
  path.join(rootDir, "data", "hyg_v41.csv.gz"),
  path.join(rootDir, "data", "hyg_v3.csv.gz"),
  path.join(rootDir, "data", "hyg_v42.csv"),
  path.join(rootDir, "data", "hyg_v41.csv"),
];

const inputPath = inputCandidates.find((candidate) => fs.existsSync(candidate));

if (!inputPath) {
  console.error(
    "No HYG catalog found. Download hyg_v3.csv.gz or hyg_v42.csv.gz into data/",
  );
  process.exit(1);
}

function readCatalog(filePath) {
  const raw = fs.readFileSync(filePath);
  const text = filePath.endsWith(".gz")
    ? zlib.gunzipSync(raw).toString("utf8")
    : raw.toString("utf8");
  return text.trim().split(/\r?\n/);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

const lines = readCatalog(inputPath);
const headers = parseCsvLine(lines[0]);
const columnIndex = Object.fromEntries(
  headers.map((header, index) => [header, index]),
);

const stars = [];

for (let i = 1; i < lines.length; i += 1) {
  const line = lines[i];
  if (!line) continue;

  const fields = parseCsvLine(line);
  const ra = Number.parseFloat(fields[columnIndex.ra]);
  const dec = Number.parseFloat(fields[columnIndex.dec]);
  const mag = Number.parseFloat(fields[columnIndex.mag]);
  const name = (fields[columnIndex.proper] ?? "").trim();

  if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag)) {
    continue;
  }

  if (mag > 8) {
    continue;
  }

  const star = { r: ra, d: dec, m: Math.round(mag * 100) / 100 };
  if (name) {
    star.n = name;
  }

  stars.push(star);
}

stars.sort((a, b) => a.m - b.m);

const outputPath = path.join(rootDir, "src", "data", "stars.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(stars));

console.log(`Processed ${stars.length} stars from ${path.basename(inputPath)}`);
console.log(`Output: ${outputPath}`);
console.log(
  `Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`,
);
