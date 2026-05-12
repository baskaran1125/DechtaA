import { db } from "../db";
import { sql } from "drizzle-orm";
async function run() {
    console.log("Dropping old tables...");
    await db.execute(sql `DROP TABLE IF EXISTS orders CASCADE;`);
    await db.execute(sql `DROP TABLE IF EXISTS products CASCADE;`);
    await db.execute(sql `DROP TABLE IF EXISTS catalog_items CASCADE;`);
    await db.execute(sql `DROP TABLE IF EXISTS users CASCADE;`);
    await db.execute(sql `DROP TABLE IF EXISTS employees CASCADE;`);
    await db.execute(sql `DROP TABLE IF EXISTS customers CASCADE;`);
    console.log("Done.");
    process.exit(0);
}
run().catch(e => {
    console.error(e);
    process.exit(1);
});
