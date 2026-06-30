import { unlinkSync, existsSync } from "fs";
const dbPath = "data/attendance.sqlite";
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
  console.log("Deleted", dbPath);
} else {
  console.log("No database file found at", dbPath);
}
