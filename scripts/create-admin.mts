import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const { auth } = await import("../src/lib/auth");
const { db, schema } = await import("../src/db");
const { eq } = await import("drizzle-orm");

const email = process.env.ADMIN_EMAIL ?? "appvocaloff@gmail.com";
const password = process.env.ADMIN_PASSWORD ?? "dqgh3ffrdg";
const name = "VocalOff Admin";

let userId: string | undefined;

try {
  const res = await auth.api.signUpEmail({
    body: { email, password, name },
  });
  userId = res.user.id;
  console.log("created user:", res.user.email);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.log("signUp skipped:", message);
}

const found = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
if (!found[0]) {
  console.error("user not found after signup");
  process.exit(1);
}
userId = found[0].id;

await db
  .update(schema.user)
  .set({ role: "admin", emailVerified: true, updatedAt: new Date() })
  .where(eq(schema.user.id, userId));

const [after] = await db.select().from(schema.user).where(eq(schema.user.id, userId)).limit(1);
console.log("admin ready:", { id: after.id, email: after.email, role: after.role });
