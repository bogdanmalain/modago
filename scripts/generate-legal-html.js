// scripts/generate-legal-html.js
//
// Genereaza paginile HTML publice pentru documentele legale, pornind de la
// aceeasi sursa folosita de aplicatie (src/constants/legal.js), ca sa nu apara
// diferente intre ce citeste utilizatorul in app si ce e publicat online.
//
// Rulare:  node scripts/generate-legal-html.js
// Rezultat: legal/index.html, legal/termeni.html, legal/confidentialitate.html,
//           legal/retur.html
//
// Google Play cere un URL public si permanent pentru Politica de
// Confidentialitate. Urca folderul `legal/` pe gazduirea ta (GitHub Pages,
// Netlify sau site-ul ModaGo) si foloseste acel link in Play Console.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "src", "constants", "legal.js");
const OUT_DIR = path.join(ROOT, "legal");

const FILENAMES = {
  terms: "termeni.html",
  privacy: "confidentialitate.html",
  returns: "retur.html",
};

/**
 * src/constants/legal.js e ESM, iar scriptul ruleaza in CommonJS.
 * Fisierul nu are importuri proprii, deci il putem evalua direct dupa ce
 * eliminam cuvantul `export`.
 */
function loadLegalModule() {
  const source = fs.readFileSync(SOURCE, "utf8");
  const stripped = source.replace(/^export\s+/gm, "");
  const factory = new Function(
    `${stripped}\nreturn { LEGAL_DOCUMENT_LIST, LEGAL_DOCUMENTS, LEGAL_DRAFT, LEGAL_ENTITY };`,
  );
  return factory();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLES = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 40px 20px 80px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.65;
  color: #111827;
  background: #f7f8fa;
}
.wrap { max-width: 760px; margin: 0 auto; }
a { color: #2563eb; }
h1 { font-size: 2rem; line-height: 1.25; margin: 0 0 6px; }
h2 { font-size: 1.15rem; margin: 34px 0 10px; }
.meta { color: #6b7280; font-size: .9rem; margin-bottom: 22px; }
.intro {
  background: #fff; border: 1px solid rgba(0,0,0,.08);
  border-radius: 14px; padding: 16px 18px; margin-bottom: 10px;
}
.draft {
  background: rgba(253,186,116,.16); border: 1px solid rgba(253,186,116,.6);
  border-radius: 12px; padding: 12px 14px; margin-bottom: 20px; font-size: .92rem;
}
p { margin: 0 0 12px; color: #374151; }
ul { margin: 0 0 14px; padding-left: 22px; }
li { margin-bottom: 8px; color: #374151; }
.nav { margin-bottom: 26px; font-size: .93rem; }
.nav a { margin-right: 16px; }
.back { display: inline-block; margin-bottom: 22px; font-weight: 600; }
footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid rgba(0,0,0,.1);
  color: #6b7280; font-size: .85rem; }
@media (prefers-color-scheme: dark) {
  body { background: #0f1115; color: #e5e7eb; }
  .intro { background: #171a21; border-color: rgba(255,255,255,.1); }
  p, li { color: #b9c0cc; }
  .meta { color: #8b93a1; }
  footer { color: #8b93a1; border-color: rgba(255,255,255,.12); }
}
`;

function renderSection(section) {
  const out = [`<h2>${escapeHtml(section.heading)}</h2>`];

  (section.body || []).forEach((p) => {
    out.push(`<p>${escapeHtml(p)}</p>`);
  });

  if (section.bullets && section.bullets.length) {
    out.push("<ul>");
    section.bullets.forEach((b) => out.push(`<li>${escapeHtml(b)}</li>`));
    out.push("</ul>");
  }

  (section.after || []).forEach((p) => {
    out.push(`<p>${escapeHtml(p)}</p>`);
  });

  return out.join("\n");
}

function renderPage(doc, isDraft, entity) {
  const nav = Object.entries(FILENAMES)
    .map(([id, file]) => {
      const label = id === doc.id ? `<strong>${id}</strong>` : id;
      return { id, file, label };
    })
    .filter((x) => x.id !== doc.id)
    .map((x) => `<a href="${x.file}">${escapeHtml(titleFor(x.id))}</a>`)
    .join("");

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)} · ModaGo</title>
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
  <a class="back" href="index.html">← ModaGo · Documente legale</a>

  <h1>${escapeHtml(doc.title)}</h1>
  <p class="meta">Versiunea ${escapeHtml(doc.version)} · actualizat ${escapeHtml(doc.updatedAt)}</p>

  ${
    isDraft
      ? `<div class="draft">Document în lucru. Textul reflectă modul actual de funcționare al aplicației, dar nu a fost încă validat juridic.</div>`
      : ""
  }

  ${doc.intro ? `<div class="intro">${escapeHtml(doc.intro)}</div>` : ""}

  ${doc.sections.map(renderSection).join("\n\n")}

  <div class="nav" style="margin-top:40px">${nav}</div>

  <footer>
    ${escapeHtml(entity.name)} ${escapeHtml(entity.legalForm)} ·
    ${escapeHtml(entity.regNumber)} · ${escapeHtml(entity.address)}, ${escapeHtml(entity.country)}<br>
    Contact: ${escapeHtml(entity.email)}
  </footer>
</div>
</body>
</html>
`;
}

function titleFor(id) {
  if (id === "terms") return "Termeni și Condiții";
  if (id === "privacy") return "Politica de Confidențialitate";
  return "Retur și rambursare";
}

function renderIndex(docs, entity) {
  const items = docs
    .map(
      (d) =>
        `<li><a href="${FILENAMES[d.id]}">${escapeHtml(d.title)}</a> — actualizat ${escapeHtml(d.updatedAt)}</li>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documente legale · ModaGo</title>
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
  <h1>ModaGo · Documente legale</h1>
  <p class="meta">Documentele care reglementează utilizarea platformei ModaGo.</p>
  <ul>
${items}
  </ul>
  <footer>
    ${escapeHtml(entity.name)} ${escapeHtml(entity.legalForm)} ·
    ${escapeHtml(entity.regNumber)} · ${escapeHtml(entity.address)}, ${escapeHtml(entity.country)}<br>
    Contact: ${escapeHtml(entity.email)}
  </footer>
</div>
</body>
</html>
`;
}

function main() {
  const { LEGAL_DOCUMENT_LIST, LEGAL_DRAFT, LEGAL_ENTITY } = loadLegalModule();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  LEGAL_DOCUMENT_LIST.forEach((doc) => {
    const file = path.join(OUT_DIR, FILENAMES[doc.id]);
    fs.writeFileSync(file, renderPage(doc, LEGAL_DRAFT, LEGAL_ENTITY), "utf8");
    console.log("scris:", path.relative(ROOT, file));
  });

  const indexFile = path.join(OUT_DIR, "index.html");
  fs.writeFileSync(
    indexFile,
    renderIndex(LEGAL_DOCUMENT_LIST, LEGAL_ENTITY),
    "utf8",
  );
  console.log("scris:", path.relative(ROOT, indexFile));

  if (LEGAL_ENTITY.name.startsWith("[")) {
    console.log(
      "\n⚠️  LEGAL_ENTITY nu e completat in src/constants/legal.js — " +
        "paginile contin inca substituenti de tipul [DENUMIRE JURIDICĂ].",
    );
  }
  if (LEGAL_DRAFT) {
    console.log(
      "⚠️  LEGAL_DRAFT = true — paginile afiseaza bannerul 'document in lucru'.",
    );
  }
}

main();
