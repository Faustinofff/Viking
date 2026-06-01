import { rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const oldDir = join(__dirname, "src", "app", "(dashboard)");
const oldAuthDir = join(__dirname, "src", "app", "(auth)");

if (existsSync(oldDir)) {
  rmSync(oldDir, { recursive: true, force: true });
  console.log("🗑️ Eliminado: (dashboard)");
}
if (existsSync(oldAuthDir)) {
  rmSync(oldAuthDir, { recursive: true, force: true });
  console.log("🗑️ Eliminado: (auth)");
}
console.log("✅ Limpieza completa");
