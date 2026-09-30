// Run the notification job once (for cron on a VM, or locally). Same logic as /api/cron/notifications.
import { sweepExpired } from "../src/lib/booking";
import { getDb } from "../src/lib/db";
import { processDue } from "../src/lib/notify";

(async () => {
  const db = await getDb();
  const expired = await sweepExpired(db);
  const result = await processDue(db, { limit: 200 });
  console.log(JSON.stringify({ expired, ...result }));
  await db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
