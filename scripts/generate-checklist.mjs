/**
 * Generates `dashboard-checklist.pdf` in the project root.
 *
 * Captures every outstanding workstream needed to take the prototype
 * dashboard to a fully functional production system. Run with:
 *   node scripts/generate-checklist.mjs
 */

import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "..", "dashboard-checklist.pdf");

/* ── content ──────────────────────────────────────────────────────── */

const sections = [
  {
    title: "1. Backend & Persistence",
    priority: "Critical",
    items: [
      "Replace mock service layer in src/lib/dashboard/api/* with real backend (Supabase recommended)",
      "Provision Postgres schema for: users/profiles, customers, shipments, shipment_events, quotes, quote_requests, customs_files, customs_documents, warehouse_zones, handling_jobs, team_tasks, automation_workflows, automation_runs, email_drafts, notifications, audit_logs, dashboard_settings",
      "Wire CRUD endpoints (read paths first, then mutations)",
      "Persist user/org-level settings (notifications, document workflow, dark mode optional)",
      "Replace useAsyncData with @tanstack/react-query (already in dependencies) for caching + revalidation",
      "Migrate static fixtures in src/data/dashboard/* to seed data",
    ],
  },
  {
    title: "2. Authentication & Authorization",
    priority: "Critical",
    items: [
      "Login / logout flow (Supabase Auth or equivalent)",
      "Session management + refresh tokens",
      "Role-based access: admin, ceo, operations, customs, sales, warehouse, viewer",
      "Route guards via TanStack Router beforeLoad → redirect to /login when unauthenticated",
      "Row Level Security (RLS) policies per role",
      "Password reset flow",
      "Optional: SSO / OAuth providers",
    ],
  },
  {
    title: "3. Forms (currently demo alerts)",
    priority: "High",
    items: [
      "New shipment form (replace alert on /dashboard/shipments)",
      "Add customer form (/dashboard/customers)",
      "New customs file form (/dashboard/customs)",
      "Schedule handling job form (/dashboard/warehouse)",
      "Invite team member flow (/dashboard/team)",
      "New quote form (/dashboard/quotes)",
      "Edit existing records — every detail panel needs an edit mode",
      "Validation: zod schemas matching API input types in lib/dashboard/api/types.ts",
      "Optimistic UI updates after mutations",
    ],
  },
  {
    title: "4. Internationalization (i18n)",
    priority: "High",
    items: [
      "Wire up real translation provider (e.g. i18next, lingui, paraglide)",
      "Translate dashboard copy to EN / NL / TR",
      "Date / number / currency formatting per locale",
      "Locale-aware sorting in tables",
      "Coordinate with public-website i18n pass at end of project",
      "Hook current useLanguage() in src/lib/dashboard/language.ts to translation provider",
    ],
  },
  {
    title: "5. Search",
    priority: "High",
    items: [
      "Replace topbar mock search with backend full-text search (Postgres trigram, Elasticsearch, or Meilisearch)",
      "Keyboard nav: ↑/↓ to move, Enter to select",
      "Debounce input",
      "URL-driven query state for shareable searches",
      "Recent searches per user",
      "Scope filters (shipments only, customers only, etc.)",
    ],
  },
  {
    title: "6. Notifications",
    priority: "High",
    items: [
      "Bell dropdown panel with read/unread state",
      "Real-time delivery via WebSocket / SSE / Supabase Realtime",
      "Browser push notifications (with user consent)",
      "Email digest delivery (daily ops digest, customs SLA alerts, ETA shifts, quote events, capacity warnings)",
      "Per-user mute / DND windows",
    ],
  },
  {
    title: "7. Automation Center (real engine)",
    priority: "High",
    items: [
      "Server-side workflow execution engine",
      "Document Completeness Check: OCR + classifier on uploaded customs docs",
      "Delay Risk Detection: trained model + carrier ETA feeds + port congestion data",
      "Email Response Assistant: server-side LLM gateway + inbound email parser + draft queue",
      "Daily Operations Summary: scheduled cron job → email + dashboard digest",
      "Task Automation Rules: persisted rule engine evaluating real events",
      "Per-run audit log (input snapshot + output) for compliance review",
      "Editable rule conditions UI (currently view-only table)",
      "Workflow enable / disable / pause persistence",
    ],
  },
  {
    title: "8. Email Integration",
    priority: "High",
    items: [
      "Outbound email gateway (SES / Postmark / Resend / SendGrid)",
      "Inbound email parsing pipeline → triggers Email Response Assistant",
      "Email template management UI",
      "Send-later queue with cancellation",
      "Bounce / complaint handling",
      "Email signature configuration",
    ],
  },
  {
    title: "9. File Storage",
    priority: "Medium",
    items: [
      "Customs document upload (Supabase Storage / S3)",
      "Quote attachments",
      "In-app file preview (PDF, images)",
      "Virus scanning on upload",
      "Signed download URLs with expiry",
      "File version history",
    ],
  },
  {
    title: "10. Real-time Updates",
    priority: "Medium",
    items: [
      "Live activity feed (Recent Automation Activity) via Realtime subscriptions",
      "Concurrent edit detection (last-write-wins or CRDT)",
      "Live shipment status changes pushed to all connected clients",
      "Presence indicators (who else is viewing this record)",
    ],
  },
  {
    title: "11. Reports",
    priority: "Medium",
    items: [
      "Real PDF / CSV export (replace mock URL in exportReport)",
      "Date range picker",
      "Scheduled report delivery (weekly / monthly digest)",
      "Custom report builder (drag-and-drop fields)",
      "Saved report templates per user",
      "Connect finance system to replace placeholder revenue chart",
    ],
  },
  {
    title: "12. Charts & Visuals",
    priority: "Low",
    items: [
      "Evaluate replacing inline SVG with Recharts (already installed) when data scale grows",
      "Tooltips with formatted values",
      "Hover highlight + click-through to detail",
      "Axis labels and grid lines for line/bar charts",
      "Verify chart colors readable in dark mode",
      "Export chart as PNG / SVG",
    ],
  },
  {
    title: "13. Quote Flow",
    priority: "High",
    items: [
      "Save quote drafts (currently in-memory only)",
      "Generate and send quote PDF to customer",
      "Customer-facing quote acceptance link (signed URL)",
      "Quote → shipment conversion (one-click)",
      "Pricing engine: rate cards per route / container / Incoterm",
      "Approval workflow with manager sign-off above threshold",
      "Quote revision history",
    ],
  },
  {
    title: "14. Shipment Lifecycle",
    priority: "High",
    items: [
      "Track every stage with timestamps in shipment_events",
      "Carrier integration: vessel ETA feeds, container tracking APIs",
      "Automatic customer notifications on status changes",
      "Document attachments per stage",
      "Map view of in-transit shipments",
      "Cross-trade tracking (third-country routing)",
    ],
  },
  {
    title: "15. Customs",
    priority: "High",
    items: [
      "Belgian PLDA integration (electronic customs declaration)",
      "EU NCTS (transit) integration",
      "Document validity checks (expiry, signature)",
      "HS code lookup with description hints",
      "Customs broker workflow + handover flag",
      "Auto-detection of missing documents per declaration type",
    ],
  },
  {
    title: "16. Warehouse",
    priority: "Medium",
    items: [
      "Real zone capacity tracking (live pallet count)",
      "Handling job scheduling with conflict detection",
      "Forklift / staff assignment + availability calendar",
      "Inventory tracking with barcode scanning",
      "Cross-dock window optimisation",
      "Reefer temperature monitoring per zone",
    ],
  },
  {
    title: "17. Team & Tasks",
    priority: "Medium",
    items: [
      "Real user invitations (email + accept link)",
      "Role assignment UI",
      "Workload calculations from real assigned shipments + tasks",
      "Time-off / shifts management",
      "Task comments + @mentions",
      "Task templates (recurring weekly checks)",
    ],
  },
  {
    title: "18. Settings",
    priority: "Medium",
    items: [
      "Real persistence of all toggles (currently in-memory mock)",
      "Differentiate user preferences vs organisation-wide preferences",
      "API key management for integrations",
      "Webhook configuration UI",
      "Company logo / branding upload",
      "Working hours + timezone configuration",
    ],
  },
  {
    title: "19. Audit & Compliance",
    priority: "High",
    items: [
      "Audit log table populated on every mutation (who / when / what / before / after)",
      "Audit log viewer (admin-only route)",
      "GDPR data export per customer",
      "GDPR right-to-be-forgotten flow",
      "SOC 2 / ISO 27001 prep if Altun pursues compliance",
      "Backup + restore policy documented",
    ],
  },
  {
    title: "20. Performance & Production",
    priority: "High",
    items: [
      "CI/CD pipeline (GitHub Actions or equivalent)",
      "Production hosting (Cloudflare Workers — wrangler.jsonc already configured)",
      "Environment variable management (.env.example placeholders → real secrets store)",
      "Error tracking (Sentry)",
      "Performance budget + Lighthouse CI",
      "Caching strategy (HTTP cache + react-query)",
      "Image optimisation pipeline",
      "Bundle size monitoring",
      "Database connection pooling at the edge",
    ],
  },
  {
    title: "21. Accessibility",
    priority: "Medium",
    items: [
      "Add focus trap to drawer (Automation Center, Quote detail) — currently missing, flagged as prototype limitation",
      "Skip-to-content link in dashboard layout",
      "Full screen-reader sweep across every route",
      "Keyboard nav audit (Tab order, arrow keys in tables)",
      "Color contrast audit — especially in new dark mode tokens",
      "Reduced-motion support (prefers-reduced-motion: reduce)",
      "Touch target size audit (44x44 minimum)",
    ],
  },
  {
    title: "22. Mobile UX",
    priority: "Medium",
    items: [
      "Bottom action bar for primary CTAs on small screens",
      "Sticky filter bar on long tables",
      "Swipe-to-dismiss on drawer (left swipe close)",
      "Pull-to-refresh on data lists",
      "Offline-friendly read-only fallback",
    ],
  },
  {
    title: "23. Testing",
    priority: "Medium",
    items: [
      "Unit tests with Vitest (utils, hooks, services)",
      "E2E tests with Playwright (critical paths: login, new quote, shipment lifecycle)",
      "Visual regression (Chromatic or Percy)",
      "Cross-browser smoke tests (Chrome, Edge, Safari, Firefox)",
      "Mobile device testing matrix",
      "Load testing (1000+ shipments, large quote table)",
    ],
  },
  {
    title: "24. Documentation",
    priority: "Low",
    items: [
      "Internal user guide for staff (operations, customs, sales)",
      "API documentation (when backend lands) — OpenAPI / Postman",
      "Onboarding flow for new dashboard users (guided tour)",
      "Help center / inline tooltips",
      "Runbook for incident response",
    ],
  },
  {
    title: "25. Polish & Quality",
    priority: "Low",
    items: [
      "Resolve 11 pre-existing fast-refresh ESLint warnings on shadcn ui files (move helpers to separate files)",
      "Loading skeleton system (currently simple text 'Loading…')",
      "Improve error boundary copy + retry UX",
      "Empty states with helpful illustrations + suggested next actions",
      "Refine dark-mode chart colors if any contrast issues surface",
      "Animation tuning (reduce or unify durations)",
    ],
  },
  {
    title: "26. Miscellaneous",
    priority: "Low",
    items: [
      "Favicons + app icons (full set: 16, 32, 180, 192, 512)",
      "PWA manifest if offline / installable mode is wanted",
      "robots / sitemap (currently noindex on dashboard — keep)",
      "Verify SSR error wrapper still surfaces correct errors after backend wiring",
      "Replace Plus + 'New …' buttons with consistent variant naming once forms exist",
    ],
  },
];

const intro = [
  "This document captures every workstream still required to take the Altun Logistics internal dashboard from prototype state to a fully functional production system.",
  "",
  "The dashboard currently runs on:",
  "  •  Static mock data in src/data/dashboard/*",
  "  •  An async service layer in src/lib/dashboard/api/* that simulates network latency",
  "  •  Local state for theme (dark mode) and language preference",
  "  •  Demo alerts on most write actions (no real persistence)",
  "  •  No authentication or role-based access",
  "",
  "Items are grouped by domain. Priority labels: Critical (blocks production), High (needed for full functionality), Medium (improves quality), Low (nice-to-have / polish).",
];

const summary = [
  ["Total sections", String(sections.length)],
  ["Total items", String(sections.reduce((s, sec) => s + sec.items.length, 0))],
  ["Critical sections", String(sections.filter((s) => s.priority === "Critical").length)],
  ["High-priority sections", String(sections.filter((s) => s.priority === "High").length)],
  ["Medium-priority sections", String(sections.filter((s) => s.priority === "Medium").length)],
  ["Low-priority sections", String(sections.filter((s) => s.priority === "Low").length)],
];

/* ── render ───────────────────────────────────────────────────────── */

const NAVY_DEEP = "#0e1832";
const BRAND = "#2f6fef";
const MUTED = "#5a6b88";
const RULE = "#d8dee9";

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 56, right: 56 },
  info: {
    Title: "Altun Logistics — Dashboard Checklist",
    Author: "Altun Logistics",
    Subject: "Outstanding work to make the operations dashboard fully functional",
  },
});

doc.pipe(fs.createWriteStream(outFile));

function priorityColor(p) {
  if (p === "Critical") return "#b91c1c";
  if (p === "High") return "#b45309";
  if (p === "Medium") return "#1d4ed8";
  return "#475569";
}

/* Cover */
doc
  .fillColor(BRAND)
  .fontSize(11)
  .font("Helvetica-Bold")
  .text("ALTUN LOGISTICS", { characterSpacing: 2 });
doc.moveDown(0.5);
doc
  .fillColor(NAVY_DEEP)
  .fontSize(28)
  .font("Helvetica-Bold")
  .text("Dashboard Checklist");
doc
  .moveDown(0.3)
  .fillColor(MUTED)
  .fontSize(11)
  .font("Helvetica")
  .text(
    "Outstanding work to take the internal operations dashboard to a fully functional production system.",
  );

doc
  .moveDown(0.8)
  .fillColor(MUTED)
  .fontSize(9)
  .text(`Generated: ${new Date().toISOString().slice(0, 10)}`);

doc.moveDown(0.6);
doc
  .strokeColor(RULE)
  .lineWidth(0.5)
  .moveTo(56, doc.y)
  .lineTo(539, doc.y)
  .stroke();

/* Intro */
doc.moveDown(0.8);
doc
  .fillColor(NAVY_DEEP)
  .fontSize(12)
  .font("Helvetica-Bold")
  .text("Current state");
doc.moveDown(0.4);
doc.fontSize(10).font("Helvetica").fillColor(NAVY_DEEP);
intro.forEach((line) => {
  if (line === "") {
    doc.moveDown(0.3);
  } else {
    doc.text(line, { lineGap: 2 });
  }
});

/* Summary table */
doc.moveDown(0.8);
doc
  .fillColor(NAVY_DEEP)
  .fontSize(12)
  .font("Helvetica-Bold")
  .text("Summary");
doc.moveDown(0.4);
doc.fontSize(10).font("Helvetica").fillColor(NAVY_DEEP);
summary.forEach(([k, v]) => {
  const y = doc.y;
  doc.text(k, 56, y, { width: 240 });
  doc.font("Helvetica-Bold").text(v, 296, y);
  doc.font("Helvetica");
  doc.moveDown(0.15);
});

/* Sections */
sections.forEach((sec, i) => {
  // Page break heuristic — leave a buffer for at least 3 lines
  if (doc.y > 720) doc.addPage();

  doc.moveDown(1.0);
  doc
    .fillColor(NAVY_DEEP)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(sec.title, { continued: false });

  // Priority pill
  const pillX = 56;
  const pillY = doc.y;
  const label = `Priority: ${sec.priority}`;
  doc
    .fillColor(priorityColor(sec.priority))
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(label, pillX, pillY);
  doc.moveDown(0.3);

  doc.fillColor(NAVY_DEEP).fontSize(10).font("Helvetica");
  sec.items.forEach((item) => {
    if (doc.y > 760) doc.addPage();
    const startY = doc.y;
    doc
      .fillColor(BRAND)
      .text("□", 56, startY, { width: 12 });
    doc
      .fillColor(NAVY_DEEP)
      .text(item, 72, startY, {
        width: 467,
        lineGap: 2,
      });
    doc.moveDown(0.15);
  });

  // Section divider
  if (i < sections.length - 1) {
    doc.moveDown(0.3);
    doc
      .strokeColor(RULE)
      .lineWidth(0.5)
      .moveTo(56, doc.y)
      .lineTo(539, doc.y)
      .stroke();
  }
});

/* Footer note on every page */
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text(
      `Altun Logistics — Dashboard Checklist  ·  Page ${i + 1} of ${range.count}`,
      56,
      810,
      { width: 483, align: "center" },
    );
}

doc.end();

console.log(`PDF written → ${outFile}`);
