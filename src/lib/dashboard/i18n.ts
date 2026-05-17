/**
 * Lightweight i18n dictionary for the dashboard UI.
 *
 * Backed by the `useLanguage()` store (en / nl / tr). `useT()` returns a
 * `t(key, vars?)` lookup that re-renders consumers when the language changes.
 * This is a local dictionary — no network, no i18n library — covering the
 * entire dashboard UI surface. Untranslated keys fall back to English, then
 * to the raw key.
 *
 * Variable interpolation: embed `{{varName}}` in a string value and pass
 * `vars: { varName: value }` to `t()`. Example:
 *   t("fleet.vesselEta", { eta: "2026-06-01", phase: "Sailing" })
 */

import { useLanguage, getStoredLanguage, type LanguagePref } from "./language";

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
  "nav.fleetTracking": {
    en: "Fleet Tracking",
    nl: "Vloottracking",
    tr: "Filo Takibi",
  },

  /* ── Preferences ────────────────────────────────────────── */
  "pref.preferences": { en: "Preferences", nl: "Voorkeuren", tr: "Tercihler" },
  "pref.language": { en: "Language", nl: "Taal", tr: "Dil" },
  "pref.darkMode": { en: "Dark mode", nl: "Donkere modus", tr: "Koyu mod" },
  "pref.lightMode": { en: "Light mode", nl: "Lichte modus", tr: "Açık mod" },
  "pref.settings": { en: "Settings", nl: "Instellingen", tr: "Ayarlar" },
  "auth.signOut": { en: "Sign out", nl: "Uitloggen", tr: "Çıkış yap" },

  /* ── Login ──────────────────────────────────────────────── */
  "login.tagline": {
    en: "Ocean freight, under full control.",
    nl: "Zeevracht, volledig onder controle.",
    tr: "Deniz yükü, tam kontrol altında.",
  },
  "login.taglineSub": {
    en: "Live demurrage clocks, AI document checks and a 3D fleet command globe — one calm, premium operations cockpit.",
    nl: "Live demurage-klokken, AI-documentcontroles en een 3D vlootcommandoglobe — één rustig, premium operatiecentrum.",
    tr: "Canlı demuraj saatleri, yapay zekâ belge kontrolleri ve 3D filo komuta küresi — tek, sakin bir premium operasyon kokpiti.",
  },
  "login.trusted": {
    en: "Trusted by importers & exporters across Europe",
    nl: "Vertrouwd door importeurs & exporteurs in heel Europa",
    tr: "Avrupa genelinde ithalatçı ve ihracatçılar tarafından güveniliyor",
  },
  "login.title": { en: "Sign in", nl: "Inloggen", tr: "Giriş yap" },
  "login.welcome": {
    en: "Welcome back — access the operations dashboard.",
    nl: "Welkom terug — toegang tot het operationele dashboard.",
    tr: "Tekrar hoşgeldiniz — operasyon panosuna erişin.",
  },
  "login.email": { en: "Email", nl: "E-mailadres", tr: "E-posta" },
  "login.emailPlaceholder": {
    en: "you@company.com",
    nl: "u@bedrijf.nl",
    tr: "siz@sirket.com",
  },
  "login.password": { en: "Password", nl: "Wachtwoord", tr: "Şifre" },
  "login.signingIn": {
    en: "Signing in…",
    nl: "Bezig met inloggen…",
    tr: "Giriş yapılıyor…",
  },
  "login.signIn": { en: "Sign in", nl: "Inloggen", tr: "Giriş yap" },
  "login.or": { en: "or", nl: "of", tr: "veya" },
  "login.google": {
    en: "Sign in with Google",
    nl: "Inloggen met Google",
    tr: "Google ile giriş yap",
  },
  "login.demo": {
    en: "Continue with demo bypass",
    nl: "Doorgaan met demo-bypass",
    tr: "Demo atlaması ile devam et",
  },
  "login.demoHint": {
    en: "Demo bypass enters the dashboard with mock data — no backend required.",
    nl: "Demo-bypass opent het dashboard met testdata — geen backend vereist.",
    tr: "Demo atlaması, sahte verilerle panoya erişim sağlar — arka uç gerekmez.",
  },

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
  "role.previewNote": {
    en: "Preview only — switches dashboard emphasis, not real access.",
    nl: "Alleen voorvertoning — wisselt dashboard-focus, geen echte toegang.",
    tr: "Yalnızca önizleme — pano vurgusunu değiştirir, gerçek erişim değil.",
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
  "top.operationsActive": {
    en: "{{count}} operations active",
    nl: "{{count}} actieve operaties",
    tr: "{{count}} aktif operasyon",
  },
  "top.searchProto": {
    en: "Prototype search — mock data only, no backend connected.",
    nl: "Prototype zoekopdracht — alleen testdata, geen backend verbonden.",
    tr: "Prototip arama — yalnızca sahte veriler, arka uç bağlı değil.",
  },
  "top.newShipment": {
    en: "New shipment",
    nl: "Nieuwe zending",
    tr: "Yeni sevkiyat",
  },

  /* ── Fleet Tracking ─────────────────────────────────────── */
  "fleet.title": {
    en: "Fleet Tracking",
    nl: "Vloottracking",
    tr: "Filo Takibi",
  },
  "fleet.sub": {
    en: "Live vessel positions and trade routes — click a vessel to fly there.",
    nl: "Live scheepsposities en handelsroutes — klik op een schip om ernaartoe te vliegen.",
    tr: "Canlı gemi konumları ve ticaret rotaları — bir gemiye tıklayarak oraya gidin.",
  },
  "fleet.loading": {
    en: "Locating the fleet…",
    nl: "Vloot lokaliseren…",
    tr: "Filo konumlandırılıyor…",
  },
  "fleet.error": {
    en: "Fleet data unavailable.",
    nl: "Vlootgegevens niet beschikbaar.",
    tr: "Filo verileri mevcut değil.",
  },
  "fleet.vessels": {
    en: "Active Vessels",
    nl: "Actieve Schepen",
    tr: "Aktif Gemiler",
  },
  "fleet.vesselEta": {
    en: "ETA {{eta}} · {{phase}}",
    nl: "ETA {{eta}} · {{phase}}",
    tr: "ETA {{eta}} · {{phase}}",
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

  /* ── Communication Hub ──────────────────────────────────── */
  "comm.inbox": { en: "Inbox", nl: "Inbox", tr: "Gelen Kutusu" },
  "comm.customerEmail": {
    en: "Customer email",
    nl: "Klant-e-mail",
    tr: "Müşteri e-postası",
  },
  "comm.aiDraft": {
    en: "AI-drafted reply",
    nl: "AI-concept-antwoord",
    tr: "Yapay zekâ taslaklı yanıt",
  },
  "comm.linkedShipment": {
    en: "Linked shipment: {{id}}",
    nl: "Gekoppelde zending: {{id}}",
    tr: "Bağlı sevkiyat: {{id}}",
  },
  "comm.sendReply": {
    en: "Send reply",
    nl: "Antwoord verzenden",
    tr: "Yanıt gönder",
  },
  "comm.sending": {
    en: "Sending…",
    nl: "Verzenden…",
    tr: "Gönderiliyor…",
  },
  "comm.editDraft": {
    en: "Edit draft",
    nl: "Concept bewerken",
    tr: "Taslağı düzenle",
  },
  "comm.prototype": {
    en: "Prototype — pre-filled with live tracking & ETA data.",
    nl: "Prototype — vooraf ingevuld met live tracking- en ETA-data.",
    tr: "Prototip — canlı takip ve ETA verileriyle önceden doldurulmuş.",
  },
  "comm.sentTitle": {
    en: "Reply sent",
    nl: "Antwoord verzonden",
    tr: "Yanıt gönderildi",
  },
  "comm.retrySend": {
    en: "Retry send",
    nl: "Opnieuw versturen",
    tr: "Yeniden gönder",
  },
  "comm.sentDesc": {
    en: "AI draft sent to {{name}}.",
    nl: "AI-concept verzonden naar {{name}}.",
    tr: "Yapay zekâ taslağı {{name}}'e gönderildi.",
  },
  "comm.draftSaved": {
    en: "Draft saved",
    nl: "Concept opgeslagen",
    tr: "Taslak kaydedildi",
  },
  "comm.draftSavedDesc": {
    en: "AI reply moved to drafts for review.",
    nl: "AI-antwoord verplaatst naar concepten ter beoordeling.",
    tr: "Yapay zekâ yanıtı inceleme için taslağa taşındı.",
  },
  "comm.selectEmail": {
    en: "Select an email to see the AI-drafted reply.",
    nl: "Selecteer een e-mail om het AI-concept-antwoord te bekijken.",
    tr: "Yapay zekâ taslaklı yanıtı görmek için bir e-posta seçin.",
  },

  /* ── Async states ───────────────────────────────────────── */
  "state.loading": {
    en: "Loading…",
    nl: "Laden…",
    tr: "Yükleniyor…",
  },
  "state.error": {
    en: "Could not load this section.",
    nl: "Kan dit gedeelte niet laden.",
    tr: "Bu bölüm yüklenemedi.",
  },
  "state.retry": { en: "Retry", nl: "Opnieuw proberen", tr: "Tekrar dene" },
  "state.empty": {
    en: "Nothing to show yet",
    nl: "Nog niets om te tonen",
    tr: "Henüz gösterilecek bir şey yok",
  },

  /* ── Error boundary ─────────────────────────────────────── */
  "error.title": {
    en: "Something went wrong",
    nl: "Er is iets misgegaan",
    tr: "Bir şeyler ters gitti",
  },
  "error.fallback": {
    en: "An unexpected error occurred.",
    nl: "Er is een onverwachte fout opgetreden.",
    tr: "Beklenmedik bir hata oluştu.",
  },
  "error.tryAgain": {
    en: "Try again",
    nl: "Opnieuw proberen",
    tr: "Tekrar dene",
  },

  /* ── Command palette ────────────────────────────────────── */
  "cmd.placeholder": {
    en: "Search shipments or run an action…",
    nl: "Zoek zendingen of voer een actie uit…",
    tr: "Sevkiyat arayın veya bir işlem çalıştırın…",
  },
  "cmd.noResults": {
    en: "No results found.",
    nl: "Geen resultaten gevonden.",
    tr: "Sonuç bulunamadı.",
  },
  "cmd.group.shipments": {
    en: "Shipments",
    nl: "Zendingen",
    tr: "Sevkiyatlar",
  },
  "cmd.group.actions": {
    en: "Quick actions",
    nl: "Snelle acties",
    tr: "Hızlı işlemler",
  },
  "cmd.group.settings": {
    en: "Settings",
    nl: "Instellingen",
    tr: "Ayarlar",
  },
  "cmd.action.delayRisk": {
    en: "Run Delay Risk automation",
    nl: "Vertragingsrisico-automatisering starten",
    tr: "Gecikme Riski otomasyonunu çalıştır",
  },
  "cmd.action.docScan": {
    en: "Run Document Completeness scan",
    nl: "Document-volledigheidscontrole uitvoeren",
    tr: "Belge Tamlığı taramasını çalıştır",
  },
  "cmd.action.automationCenter": {
    en: "Go to Automation Center",
    nl: "Naar Automatiseringscentrum",
    tr: "Otomasyon Merkezine git",
  },
  "cmd.action.fleetTracking": {
    en: "Go to Fleet Tracking",
    nl: "Naar Vloottracking",
    tr: "Filo Takibine git",
  },
  "cmd.action.switchRole": {
    en: "Switch to {{role}} view",
    nl: "Wisselen naar {{role}}-weergave",
    tr: "{{role}} görünümüne geç",
  },
  "cmd.action.toggleTheme": {
    en: "Toggle {{mode}} mode",
    nl: "{{mode}} modus inschakelen",
    tr: "{{mode}} moduna geç",
  },
  "cmd.action.switchLang": {
    en: "Switch language to {{lang}}",
    nl: "Taal wisselen naar {{lang}}",
    tr: "Dili {{lang}} olarak değiştir",
  },
  "cmd.footer": {
    en: "ALTUN command palette",
    nl: "ALTUN opdrachtenpallet",
    tr: "ALTUN komut paleti",
  },

  /* ── Settings tabs ──────────────────────────────────────── */
  "settings.tabs.profile": {
    en: "Profile",
    nl: "Profiel",
    tr: "Profil",
  },
  "settings.tabs.preferences": {
    en: "Preferences",
    nl: "Voorkeuren",
    tr: "Tercihler",
  },
  "settings.tabs.automation": {
    en: "Automation Rules",
    nl: "Automatiseringsregels",
    tr: "Otomasyon Kuralları",
  },
  "settings.tabs.api": {
    en: "API Connections",
    nl: "API-verbindingen",
    tr: "API Bağlantıları",
  },
  "settings.profile.desc": {
    en: "Your account identity within the operations workspace.",
    nl: "Uw accountidentiteit in de operationele werkruimte.",
    tr: "Operasyon çalışma alanındaki hesap kimliğiniz.",
  },
  "settings.prefs.desc": {
    en: "Appearance and interface language. Synced with the sidebar.",
    nl: "Uiterlijk en interfacetaal. Gesynchroniseerd met de zijbalk.",
    tr: "Görünüm ve arayüz dili. Kenar çubuğuyla eşitleniyor.",
  },
  "settings.profile.workspace": {
    en: "Workspace",
    nl: "Werkruimte",
    tr: "Çalışma Alanı",
  },
  "settings.profile.activeRole": {
    en: "Active role",
    nl: "Actieve rol",
    tr: "Aktif rol",
  },
  "settings.profile.region": {
    en: "Region",
    nl: "Regio",
    tr: "Bölge",
  },
  "settings.profile.since": {
    en: "Member since",
    nl: "Lid sinds",
    tr: "Üye olma tarihi",
  },
  "settings.demurrage": {
    en: "Demurrage Risk Alerts",
    nl: "Demurrage-risicowaarschuwingen",
    tr: "Demuraj Risk Uyarıları",
  },
  "settings.demurrage.desc": {
    en: "Tune when containers turn amber and red across the Overview and Planner boards. Changes apply live.",
    nl: "Stel in wanneer containers oranje en rood worden op de Overzichts- en Planningsborden. Wijzigingen worden direct toegepast.",
    tr: "Genel Bakış ve Planlama panolarında konteynerlerin sarıya ve kırmızıya döndüğü anı ayarlayın. Değişiklikler anında uygulanır.",
  },
  "settings.critical": {
    en: "Critical alert threshold",
    nl: "Kritieke waarschuwingsdrempel",
    tr: "Kritik uyarı eşiği",
  },
  "settings.critical.label": {
    en: "Critical zone — turns red",
    nl: "Kritieke zone — wordt rood",
    tr: "Kritik bölge — kırmızıya döner",
  },
  "settings.warning": {
    en: "Warning alert threshold",
    nl: "Waarschuwingsdrempel",
    tr: "Uyarı eşiği",
  },
  "settings.warning.label": {
    en: "Warning zone — turns amber",
    nl: "Waarschuwingszone — wordt oranje",
    tr: "Uyarı bölgesi — sarıya döner",
  },
  "settings.threshold.info": {
    en: "Containers with under {{critical}}h of free time show red; under {{warning}}h show amber.",
    nl: "Containers met minder dan {{critical}}u vrije tijd worden rood weergegeven; minder dan {{warning}}u wordt oranje.",
    tr: "{{critical}} saatin altında serbest süresi olan konteynerler kırmızı; {{warning}} saatin altında olanlar sarı gösterilir.",
  },
  "settings.rule.autoScan": {
    en: "Auto-scan new booking files for missing documents",
    nl: "Automatisch nieuwe dossiers scannen op ontbrekende documenten",
    tr: "Eksik belgeler için yeni rezervasyon dosyalarını otomatik tara",
  },
  "settings.rule.emailExporters": {
    en: "Email exporters automatically on a customs hold",
    nl: "Exporteurs automatisch e-mailen bij een douaneblokkering",
    tr: "Gümrük tutuklamasında ihracatçılara otomatik e-posta gönder",
  },
  "settings.rule.escalate": {
    en: "Escalate to a manager if unresolved after 24h",
    nl: "Escaleer naar een manager als het na 24 uur niet is opgelost",
    tr: "24 saat içinde çözüme kavuşmazsa yöneticiye ilet",
  },
  "settings.rules.saved": {
    en: "Rules saved",
    nl: "Regels opgeslagen",
    tr: "Kurallar kaydedildi",
  },
  "settings.rules.savedDesc": {
    en: "Automation rules are stored.",
    nl: "Automatiseringsregels zijn opgeslagen.",
    tr: "Otomasyon kuralları kaydedildi.",
  },
  "settings.connection": {
    en: "Backend Connection",
    nl: "Backend-verbinding",
    tr: "Arka Uç Bağlantısı",
  },
  "settings.api.desc": {
    en: "Connect a Supabase project to swap mock data for live data. The dashboard runs fully on mock data until then.",
    nl: "Verbind een Supabase-project om testdata te vervangen door live data. Het dashboard werkt volledig op testdata totdat dit is gedaan.",
    tr: "Sahte verileri canlı verilerle değiştirmek için bir Supabase projesi bağlayın. Bağlantı kurulana kadar panel tamamen sahte verilerle çalışır.",
  },
  "settings.api.notConnected": {
    en: "Not connected — running on mock data",
    nl: "Niet verbonden — werkt op testdata",
    tr: "Bağlı değil — sahte verilerle çalışıyor",
  },
  "settings.api.urlLabel": {
    en: "Supabase project URL",
    nl: "Supabase-project URL",
    tr: "Supabase proje URL'si",
  },
  "settings.api.keyLabel": {
    en: "Anon / publishable key",
    nl: "Anonieme / publieke sleutel",
    tr: "Anonim / yayınlanabilir anahtar",
  },
  "settings.api.keyPlaceholder": {
    en: "paste the publishable anon key",
    nl: "plak de publieke anonieme sleutel",
    tr: "yayınlanabilir anonim anahtarı yapıştırın",
  },
  "settings.api.warning": {
    en: "Never paste the service-role key here — only the publishable anon key belongs on the client.",
    nl: "Plak hier nooit de service-role-sleutel — alleen de publieke anonieme sleutel hoort op de client.",
    tr: "Buraya asla hizmet rolü anahtarı yapıştırmayın — yalnızca yayınlanabilir anonim anahtar istemcide kullanılabilir.",
  },
  "settings.api.test": {
    en: "Test connection",
    nl: "Verbinding testen",
    tr: "Bağlantıyı test et",
  },
  "settings.api.protoTitle": {
    en: "Prototype",
    nl: "Prototype",
    tr: "Prototip",
  },
  "settings.api.protoDesc": {
    en: "Backend connection is a placeholder in this preview.",
    nl: "De backend-verbinding is een tijdelijke aanduiding in dit voorbeeld.",
    tr: "Bu önizlemede arka uç bağlantısı bir yer tutucudur.",
  },
  "settings.save": {
    en: "Save changes",
    nl: "Wijzigingen opslaan",
    tr: "Değişiklikleri kaydet",
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
  "common.results": { en: "results", nl: "resultaten", tr: "sonuç" },
  "common.noMatches": {
    en: "Nothing matches your search.",
    nl: "Niets komt overeen met je zoekopdracht.",
    tr: "Aramanızla eşleşen bir şey yok.",
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

/**
 * Resolve a key for an explicit language (use outside React if needed).
 * Supports `{{varName}}` interpolation via the optional `vars` argument.
 */
export function translate(
  key: I18nKey,
  language: LanguagePref,
  vars?: Record<string, string | number>,
): string {
  const entry = dictionary[key];
  let str = entry?.[language] ?? entry?.en ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }
  return str;
}

/**
 * Convenience helper for use outside React components (e.g., class-based
 * ErrorBoundary). Reads language directly from localStorage.
 */
export function translateStored(
  key: I18nKey,
  vars?: Record<string, string | number>,
): string {
  return translate(key, getStoredLanguage(), vars);
}

/**
 * Returns a `t(key, vars?)` function bound to the current language.
 * Re-renders consumers whenever the language preference changes.
 */
export function useT(): (
  key: I18nKey,
  vars?: Record<string, string | number>,
) => string {
  const { language } = useLanguage();
  return (key: I18nKey, vars?: Record<string, string | number>) =>
    translate(key, language, vars);
}
