import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendRoot, "..");

const cargoTomlPath = path.join(repoRoot, "backend", "Cargo.toml");
const outputDir = path.join(frontendRoot, "src", "generated");
const outputPath = path.join(outputDir, "version.ts");
const packageJsonPath = path.join(frontendRoot, "package.json");

const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
const match = cargoToml.match(/^\s*version\s*=\s*"([^"]+)"/m);

if (!match) {
  throw new Error(`Could not parse version from ${cargoTomlPath}`);
}

const version = match[1];
const content = `export const APP_VERSION = "${version}";\n`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, content, "utf8");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
if (packageJson.version !== version) {
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  console.log(`[sync-version] Updated frontend/package.json version -> ${version}`);
}

console.log(`[sync-version] Cargo version ${version} -> ${path.relative(repoRoot, outputPath)}`);
