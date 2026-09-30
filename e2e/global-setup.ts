import fs from "node:fs";

export default function globalSetup() {
  fs.rmSync(".data/e2e", { recursive: true, force: true });
}
