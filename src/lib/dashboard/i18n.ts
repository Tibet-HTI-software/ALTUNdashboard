/**
 * Lightweight i18n dictionary for the dashboard UI.
 *
 * Backed by the `useLanguage()` store (en / nl / tr). `useT()` returns a
 * `t(key)` lookup that re-renders consumers when the language changes.
 * This is a local dictionary — no network, no i18n library — covering the
 * dashboard chrome and the role-based section headings. Untranslated keys
 * fall back to English, then to the raw key.
 */

import { useLanguage, type LanguagePref } from "./language";

type Entry = Record<LanguagePref, string>;

export const dictionary = {
  /* ── Navigation ─────────────────────────────────────────── */
  "nav.workspace": { en: "Workspace", nl: "Werkruimte", tr: "Çalışma Alanı" },
  "nav.quickAccess": {
    en: "Quick Access",
    nl: "Snelle toegang",
    tr: "Hızlı Erişim",
  },
  "nav.overview": { en: "Overview", nl: "Overzicht", tr: "Genel Bakış" },
  "nav.shipments": { en: "Shipments", nl: "Zendingen", tr: "Sevkiyatlar" },
  "nav.customers": { en: "Customers", nl: "Klanten", tr: "Müşteriler" },
  "nav.quotes": { en: "Quotes", nl: "Offertes", tr: "Teklifler" },
  "nav.customs": {
    en: "Customs & Documents",
    nl: "Douane & Documenten",
    tr: "Gümrük & Belgeler",
  },
  "nav.warehouse": {
    en: "Warehouse & Operations",
    nl: "Magazijn & Operaties",
    tr: "Depo & Operasyon",
  },
  "nav.team": { en: "Team", nl: "Team", tr: "Ekip" },
  "nav.reports": { en: "Reports", nl: "Rapporten", tr: "Raporlar" },
  "nav.automation": {
    en: "Automation Center",
    nl: "Automatiseringscentrum",
    tr: "Otomasyon Merkezi",
  },
  "nav.automationSub": {
    en: "Quick actions for everyone",
    nl: "Snelle acties voor iedereen",
    tr: "Herkes için hızlı işlemler",
  },

  /* ── Preferences ────────────────────────────────────────── */
  "pref.preferences": { en: "Preferences", nl: "Voorkeuren", tr: "Tercihler" },
  "pref.language": { en: "Language", nl: "Taal", tr: "Dil" },
  "pref.darkMode": { en: "Dark mode", nl: "Donkere modus", tr: "Koyu mod" },
  "pref.lightMode": { en: "Light mode", nl: "Lichte modus", tr: "Açık mod" },
  "pref.settings": { en: "Settings", nl: "Instellingen", tr: "Ayarlar" },
  "auth.signOut": { en: "Sign out", nl: "Uitloggen", tr: "Çıkış yap" },

  /* ── Role switcher ──────────────────────────────────────── */
  "role.preview": {
    en: "Preview as",
    nl: "Bekijk als",
    tr: "Önizle",
  },
  "role.previewing": {
    en: "Previewing role",
    nl: "Rolweergave",
    tr: "Rol önizlemesi",
  },

  /* ── Topbar ─────────────────────────────────────────────── */
  "top.search": {
    en: "Search container, B/L, vessel, trader…",
    nl: "Zoek container, B/L, schip, handelaar…",
    tr: "Konteyner, B/L, gemi, tüccar ara…",
  },
  "top.systemsLive": {
    en: "Systems live",
    nl: "Systemen actief",
    tr: "Sistemler aktif",
  },
  "top.newShipment": {
    en: "New shipment",
    nl: "Nieuwe zending",
    tr: "Yeni sevkiyat",
  },

  /* ── Role dashboards ────────────────────────────────────── */
  "ceo.title": {
    en: "Management Overview",
    nl: "Managementoverzicht",
    tr: "Yönetim Genel Görünümü",
  },
  "ceo.subtitle": {
    en: "On-time performance, volumes and weekly booking trend.",
    nl: "Prestaties, volumes en wekelijkse boekingstrend.",
    tr: "Zamanında performans, hacimler ve haftalık rezervasyon eğilimi.",
  },
  "planner.title": {
    en: "Demurrage Risk Board",
    nl: "Demurrage-risicobord",
    tr: "Demuraj Risk Panosu",
  },
  "planner.subtitle": {
    en: "Containers approaching their terminal free-time limit.",
    nl: "Containers die hun vrije terminaltijd naderen.",
    tr: "Terminal serbest süre sınırına yaklaşan konteynerler.",
  },
  "customs.title": {
    en: "Customs Action Center",
    nl: "Douane-actiecentrum",
    tr: "Gümrük İşlem Merkezi",
  },
  "customs.subtitle": {
    en: "Blocked declarations waiting on documentation.",
    nl: "Geblokkeerde aangiftes die op documenten wachten.",
    tr: "Belge bekleyen bloke beyannameler.",
  },
  "service.title": {
    en: "Smart Communication Hub",
    nl: "Slim communicatiecentrum",
    tr: "Akıllı İletişim Merkezi",
  },
  "service.subtitle": {
    en: "Client emails paired with AI-drafted, data-filled replies.",
    nl: "Klant-e-mails met AI-concepten vol live data.",
    tr: "Yapay zekâ taslaklı yanıtlarla eşleşen müşteri e-postaları.",
  },

  /* ── Common ─────────────────────────────────────────────── */
  "common.viewAll": { en: "View all", nl: "Bekijk alles", tr: "Tümünü gör" },
  "common.freeTimeLeft": {
    en: "Free time left",
    nl: "Vrije tijd over",
    tr: "Kalan serbest süre",
  },
  "common.inDemurrage": {
    en: "In demurrage",
    nl: "In demurrage",
    tr: "Demurajda",
  },
  "common.generateEmail": {
    en: "Generate AI Email to Exporter",
    nl: "Genereer AI-e-mail naar exporteur",
    tr: "İhracatçıya yapay zekâ e-postası oluştur",
  },
  "common.useDraft": {
    en: "Use AI draft",
    nl: "Gebruik AI-concept",
    tr: "Yapay zekâ taslağını kullan",
  },

  /* ── Sub-pages ──────────────────────────────────────────── */
  "page.shipments.title": {
    en: "Ocean Freight Shipments",
    nl: "Zeevracht Zendingen",
    tr: "Deniz Yükü Sevkiyatları",
  },
  "page.shipments.sub": {
    en: "All sea-freight bookings — sort and filter live.",
    nl: "Alle zeevrachtboekingen — live sorteren en filteren.",
    tr: "Tüm deniz yükü rezervasyonları — canlı sırala ve filtrele.",
  },
  "page.customers.title": {
    en: "Trader Profiles",
    nl: "Handelaarsprofielen",
    tr: "Tüccar Profilleri",
  },
  "page.customers.sub": {
    en: "Importers & exporters grouped by active container volume.",
    nl: "Importeurs & exporteurs gegroepeerd op actief containervolume.",
    tr: "Aktif konteyner hacmine göre ithalatçı ve ihracatçılar.",
  },
  "page.quotes.title": {
    en: "Open Quotes",
    nl: "Openstaande Offertes",
    tr: "Açık Teklifler",
  },
  "page.quotes.sub": {
    en: "Ocean freight rate requests awaiting approval.",
    nl: "Zeevrachttarief-aanvragen die op goedkeuring wachten.",
    tr: "Onay bekleyen deniz yükü navlun talepleri.",
  },
  "page.settings.title": { en: "Settings", nl: "Instellingen", tr: "Ayarlar" },
  "page.settings.sub": {
    en: "Risk-alert thresholds and backend connection.",
    nl: "Risicodrempels en backend-verbinding.",
    tr: "Risk uyarı eşikleri ve arka uç bağlantısı.",
  },

  "col.container": { en: "Container", nl: "Container", tr: "Konteyner" },
  "col.route": { en: "Route", nl: "Route", tr: "Rota" },
  "col.carrier": { en: "Carrier", nl: "Vervoerder", tr: "Taşıyıcı" },
  "col.vessel": {
    en: "Vessel / Voyage",
    nl: "Schip / Reis",
    tr: "Gemi / Sefer",
  },
  "col.status": { en: "Status", nl: "Status", tr: "Durum" },
  "col.freeTime": {
    en: "Free time",
    nl: "Vrije tijd",
    tr: "Serbest süre",
  },
  "col.trader": { en: "Trader", nl: "Handelaar", tr: "Tüccar" },
  "col.type": { en: "Type", nl: "Type", tr: "Tip" },

  "filter.carrier": { en: "Carrier", nl: "Vervoerder", tr: "Taşıyıcı" },
  "filter.status": { en: "Status", nl: "Status", tr: "Durum" },
  "filter.port": {
    en: "Destination port",
    nl: "Bestemmingshaven",
    tr: "Varış limanı",
  },
  "filter.all": { en: "All", nl: "Alle", tr: "Tümü" },

  "common.results": { en: "results", nl: "resultaten", tr: "sonuç" },
  "common.noMatches": {
    en: "Nothing matches your search.",
    nl: "Niets komt overeen met je zoekopdracht.",
    tr: "Aramanızla eşleşen bir şey yok.",
  },

  "quote.review": {
    en: "Review & Approve",
    nl: "Beoordeel & Keur goed",
    tr: "İncele & Onayla",
  },
  "quote.approve": {
    en: "Approve quote",
    nl: "Offerte goedkeuren",
    tr: "Teklifi onayla",
  },
  "quote.decline": { en: "Decline", nl: "Afwijzen", tr: "Reddet" },

  "settings.demurrage": {
    en: "Demurrage Risk Alerts",
    nl: "Demurrage-risicowaarschuwingen",
    tr: "Demuraj Risk Uyarıları",
  },
  "settings.critical": {
    en: "Critical alert threshold",
    nl: "Kritieke waarschuwingsdrempel",
    tr: "Kritik uyarı eşiği",
  },
  "settings.warning": {
    en: "Warning alert threshold",
    nl: "Waarschuwingsdrempel",
    tr: "Uyarı eşiği",
  },
  "settings.connection": {
    en: "Backend Connection",
    nl: "Backend-verbinding",
    tr: "Arka Uç Bağlantısı",
  },
  "settings.save": {
    en: "Save changes",
    nl: "Wijzigingen opslaan",
    tr: "Değişiklikleri kaydet",
  },

  /* ── Automation Center ──────────────────────────────────── */
  "auto.title": {
    en: "Automation Center",
    nl: "Automatiseringscentrum",
    tr: "Otomasyon Merkezi",
  },
  "auto.sub": {
    en: "AI workflows that replace slow manual email chasing.",
    nl: "AI-workflows die traag handmatig mailwerk vervangen.",
    tr: "Yavaş manuel e-posta takibini değiştiren yapay zekâ akışları.",
  },
  "auto.companion": {
    en: "ALTUN AI Companion",
    nl: "ALTUN AI-assistent",
    tr: "ALTUN Yapay Zekâ Asistanı",
  },
  "auto.ask": {
    en: "Ask the AI companion…",
    nl: "Vraag de AI-assistent…",
    tr: "Yapay zekâ asistanına sor…",
  },
  "auto.reviewDocs": {
    en: "Review Documents",
    nl: "Documenten bekijken",
    tr: "Belgeleri İncele",
  },
  "auto.contactCustomer": {
    en: "Contact Customer",
    nl: "Klant contacteren",
    tr: "Müşteriyle İletişime Geç",
  },
  "auto.viewDetails": {
    en: "View details",
    nl: "Details bekijken",
    tr: "Ayrıntıları gör",
  },
  "auto.scannedToday": {
    en: "Scanned today",
    nl: "Vandaag gescand",
    tr: "Bugün tarandı",
  },
  "auto.kpi.active": {
    en: "Active Automations",
    nl: "Actieve automatiseringen",
    tr: "Aktif Otomasyonlar",
  },
  "auto.kpi.docs": {
    en: "Documents Checked",
    nl: "Documenten gecontroleerd",
    tr: "Kontrol Edilen Belgeler",
  },
  "auto.kpi.risk": {
    en: "High-Risk Shipments",
    nl: "Hoog-risico zendingen",
    tr: "Yüksek Riskli Sevkiyatlar",
  },
  "auto.kpi.drafts": {
    en: "Draft Messages",
    nl: "Concept-berichten",
    tr: "Taslak Mesajlar",
  },
  "auto.wf.docs": {
    en: "Document Completeness",
    nl: "Documentvolledigheid",
    tr: "Belge Tamlığı",
  },
  "auto.wf.docs.desc": {
    en: "Scans every booking file for missing customs documents.",
    nl: "Scant elk dossier op ontbrekende douanedocumenten.",
    tr: "Eksik gümrük belgeleri için her dosyayı tarar.",
  },
  "auto.wf.delay": {
    en: "Delay Risk Detection",
    nl: "Vertragingsrisicodetectie",
    tr: "Gecikme Riski Tespiti",
  },
  "auto.wf.delay.desc": {
    en: "Watches demurrage clocks and flags containers at risk.",
    nl: "Bewaakt demurrage-klokken en markeert risicocontainers.",
    tr: "Demuraj saatlerini izler ve riskli konteynerleri işaretler.",
  },
  "auto.wf.email": {
    en: "Email Response Assistant",
    nl: "E-mail-antwoordassistent",
    tr: "E-posta Yanıt Asistanı",
  },
  "auto.wf.email.desc": {
    en: "Drafts data-filled replies to customer status emails.",
    nl: "Stelt antwoorden met live data op voor klant-e-mails.",
    tr: "Müşteri e-postalarına veri dolu yanıtlar hazırlar.",
  },
  "auto.panel.map": {
    en: "Vessel Positions",
    nl: "Scheepsposities",
    tr: "Gemi Konumları",
  },
  "auto.panel.exceptions": {
    en: "Document Exceptions",
    nl: "Documentuitzonderingen",
    tr: "Belge İstisnaları",
  },
  "auto.panel.timeline": {
    en: "Process Milestones",
    nl: "Procesmijlpalen",
    tr: "Süreç Kilometre Taşları",
  },
  "auto.panel.usage": {
    en: "Usage Data",
    nl: "Gebruiksgegevens",
    tr: "Kullanım Verileri",
  },
  "auto.panel.controls": {
    en: "Control Panel",
    nl: "Bedieningspaneel",
    tr: "Kontrol Paneli",
  },
  "auto.confidence": {
    en: "AI confidence",
    nl: "AI-betrouwbaarheid",
    tr: "Yapay zekâ güveni",
  },
} satisfies Record<string, Entry>;

export type I18nKey = keyof typeof dictionary;

/** Resolve a key for an explicit language (use outside React if needed). */
export function translate(key: I18nKey, language: LanguagePref): string {
  const entry = dictionary[key];
  return entry?.[language] ?? entry?.en ?? key;
}

/**
 * Returns a `t(key)` function bound to the current language. Re-renders
 * consumers whenever the language preference changes.
 */
export function useT(): (key: I18nKey) => string {
  const { language } = useLanguage();
  return (key: I18nKey) => translate(key, language);
}
