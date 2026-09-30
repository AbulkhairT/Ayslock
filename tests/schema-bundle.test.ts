import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { schemaBundle } from "../scripts/schema-bundle";

describe("supabase/schema.sql", () => {
  it("matches the migrations (run `npm run db:schema` after changing one)", () => {
    expect(fs.readFileSync("supabase/schema.sql", "utf8")).toBe(schemaBundle());
  });
});
