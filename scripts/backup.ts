import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Basit pg_dump wrapper. Docker içindeki postgres container'ına exec ile dump alır.
 * Windows Task Scheduler ile günlük tetiklenmek üzere yazıldı.
 *
 * Kullanım:
 *   npm run db:backup
 */

const BACKUP_DIR = process.env.BACKUP_DIR ?? "./backups";
const CONTAINER = "numune_postgres";
const DB = process.env.POSTGRES_DB ?? "numune_master";
const USER = process.env.POSTGRES_USER ?? "postgres";

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function main() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const filename = join(BACKUP_DIR, `numune_${timestamp()}.sql`);

  console.log(`→ Yedek alınıyor: ${filename}`);
  try {
    execSync(`docker exec ${CONTAINER} pg_dump -U ${USER} -d ${DB} > "${filename}"`, {
      stdio: "inherit",
      shell: process.platform === "win32" ? "powershell.exe" : "/bin/sh",
    });
    console.log("✓ Yedek tamamlandı.");
  } catch (err) {
    console.error("✗ Yedek başarısız:", err);
    process.exit(1);
  }
}

main();
