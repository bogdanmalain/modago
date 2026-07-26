// scripts/sync-eas-env.js
//
// Copiaza variabilele din .env in EAS, ca build-urile din cloud sa le aiba.
//
// DE CE E NEVOIE:
// Build-urile de tip `development` merg si fara asta, pentru ca JS-ul si
// configuratia vin de la Metro-ul care ruleaza pe laptopul tau si care citeste
// .env local. Un build `preview` sau `production` insa are JS-ul impachetat pe
// serverele EAS, unde .env NU ajunge (e in .gitignore). Fara variabilele astea
// pe EAS, aplicatia construita porneste si crapa imediat cu
// "[supabaseClient] Lipsesc variabilele de mediu".
//
// Rulare:
//   node scripts/sync-eas-env.js            (development + preview)
//   node scripts/sync-eas-env.js --prod     (adauga si production)
//
// ⚠️ --prod scrie valorile ACTUALE din .env in mediul de productie. Cat timp
// STRIPE_PUBLISHABLE_KEY e o cheie de test (pk_test_...), NU folosi --prod:
// ai ajunge cu o aplicatie „de productie" legata la plati sandbox.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env");

// nume -> vizibilitate in EAS
//  plaintext = se vede in UI, sensitive = ascuns in UI, secret = doar pe builder
const PLAN = [
  ["SUPABASE_URL", "plaintext"],
  ["SUPABASE_ANON_KEY", "sensitive"],
  ["STRIPE_PUBLISHABLE_KEY", "sensitive"],
  ["SENTRY_DSN", "sensitive"],
  ["SENTRY_ORG", "plaintext"],
  ["SENTRY_PROJECT", "plaintext"],
  ["SENTRY_AUTH_TOKEN", "secret"],
];

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error("Nu gasesc .env in", ROOT);
    process.exit(1);
  }
  // ﻿ = BOM-ul pe care il lasa unele editoare pe Windows; fara asta
  // prima variabila din fisier nu se potriveste niciodata.
  const raw = fs.readFileSync(ENV_FILE, "utf8").replace(/^﻿/, "");
  const out = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq < 0) return;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
  return out;
}

function main() {
  const withProd = process.argv.includes("--prod");
  const env = readEnvFile();

  const environments = ["development", "preview"];
  if (withProd) environments.push("production");

  console.log("Medii tinta:", environments.join(", "));

  if (withProd) {
    const stripe = env.STRIPE_PUBLISHABLE_KEY || "";
    if (stripe.startsWith("pk_test")) {
      console.error(
        "\n⚠️  OPRIT: STRIPE_PUBLISHABLE_KEY e inca o cheie de test (pk_test_...).\n" +
          "   Nu scriu chei sandbox in mediul de productie. Pune cheia live in .env\n" +
          "   si ruleaza din nou, sau ruleaza fara --prod.",
      );
      process.exit(1);
    }
  }

  let created = 0;
  let skipped = 0;

  for (const [name, visibility] of PLAN) {
    const value = env[name];
    if (!value) {
      console.log(name.padEnd(24), "-> sarit (lipseste sau e gol in .env)");
      skipped++;
      continue;
    }

    const args = [
      "eas-cli",
      "env:create",
      "--name",
      name,
      "--value",
      value,
      "--visibility",
      visibility,
      "--scope",
      "project",
      "--force",
      "--non-interactive",
    ];
    environments.forEach((e) => args.push("--environment", e));

    try {
      execFileSync("npx", args, { stdio: "pipe", shell: true });
      console.log(name.padEnd(24), "-> setat (" + visibility + ")");
      created++;
    } catch (e) {
      const msg = String(e.stderr || e.stdout || e.message)
        .split("\n")
        .filter(Boolean)
        .slice(-2)
        .join(" ");
      console.log(name.padEnd(24), "-> EROARE:", msg.slice(0, 160));
    }
  }

  console.log(`\nGata: ${created} setate, ${skipped} sarite.`);
  console.log("Verifica cu: npx eas-cli env:list --environment preview");
}

main();
