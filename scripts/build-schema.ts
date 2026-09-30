import fs from "node:fs";
import { schemaBundle } from "./schema-bundle";

fs.writeFileSync("supabase/schema.sql", schemaBundle());
console.log("Wrote supabase/schema.sql");
