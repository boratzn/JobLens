const { execSync } = require("child_process");

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (dbUrl && !dbUrl.includes("localhost:5432/postgres") && !dbUrl.includes("[PROJE-REF]")) {
  console.log("Applying database migrations with Prisma...");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  } catch (error) {
    console.error("Migration error:", error.message);
    // Don't fail build if migration is handled manually or already up to date
  }
} else {
  console.log("Skipping database migration: Supabase DIRECT_URL/DATABASE_URL is not set or using local template.");
}
