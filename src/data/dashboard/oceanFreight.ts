/**
 * Ocean Freight mock dataset.
 *
 * Rich import/export sea-freight shipments for the role-based dashboard
 * preview. Demurrage & Detention (D&D) free-time is stored as an absolute
 * `freeTimeExpiresAt` ISO timestamp generated relative to load time, so the
 * countdown on the Demurrage Risk Board stays realistic whenever the demo
 * is opened.
 *
 * The service layer (`lib/dashboard/api/oceanFreight.api.ts`) is the only
 * consumer — routes/components never import this file directly.
 */

export type ContainerType =
  | "20ft Dry"
  | "40ft Dry"
  | "40ft High-Cube"
  | "20ft Reefer"
  | "40ft Reefer";

export type ShipmentDirection = "Import" | "Export";

export type ShipmentPhase =
  | "Booked"
  | "In Transit"
  | "Discharged"
  | "Customs Hold"
  | "Released"
  | "Delivered";

export type CustomsBlockReason =
  | "Missing Commercial Invoice"
  | "Certificate of Origin Hold"
  | "Packing List Discrepancy"
  | "Incomplete Bill of Lading"
  | "Pending Duty Payment"
  | "Phytosanitary Certificate Missing";

export type CarrierName =
  | "Maersk"
  | "MSC"
  | "CMA CGM"
  | "Hapag-Lloyd"
  | "ONE"
  | "Evergreen";

export interface OceanShipment {
  /** Internal booking reference. */
  id: string;
  /** Bill of Lading number. */
  blNumber: string;
  /** ISO 6346 container number. */
  containerNumber: string;
  containerType: ContainerType;
  direction: ShipmentDirection;
  carrier: CarrierName;
  vessel: string;
  voyage: string;
  /** Port of Loading. */
  pol: string;
  /** Port of Discharge. */
  pod: string;
  terminal: string;
  /** Importer or exporter company. */
  trader: string;
  traderType: "Importer" | "Exporter";
  traderContact: string;
  traderEmail: string;
  phase: ShipmentPhase;
  /** Estimated time of departure (ISO date). */
  etd: string;
  /** Estimated time of arrival (ISO date). */
  eta: string;
  /** When the container was discharged at POD, or null if not yet. */
  dischargedAt: string | null;
  /** Contractual free days granted by the carrier at the terminal. */
  freeDaysTotal: number;
  /**
   * Absolute moment the free time runs out. After this, demurrage accrues.
   * Generated relative to now so the countdown is always live.
   */
  freeTimeExpiresAt: string;
  /** Demurrage cost per day once free time expires (EUR). */
  demurrageRatePerDay: number;
  /** Customs documentation hold, or null when clear. */
  customsBlock: CustomsBlockReason | null;
  teu: number;
  weightKg: number;
  commodity: string;
}

export type EmailIntent =
  | "Status Update"
  | "ETA Request"
  | "Document Request"
  | "Demurrage Query";

export interface CustomerEmail {
  id: string;
  fromName: string;
  fromCompany: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  /** Linked shipment reference. */
  shipmentId: string;
  intent: EmailIntent;
  /** AI-generated reply, pre-filled with live shipment data. */
  aiDraft: string;
}

/** Hours-from-now offsets — drive the live D&D countdown per shipment. */
const FREE_TIME_OFFSETS_H = [
  -36, // already in demurrage
  9, // critical  (<24h)
  19, // critical  (<24h)
  41, // warning   (<72h)
  62, // warning   (<72h)
  140, // healthy
];

function isoFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Builds the Ocean Freight shipment list with free-time expiry timestamps
 * anchored to the current time. Call once per request from the service.
 */
export function buildOceanShipments(): OceanShipment[] {
  return [
    {
      id: "ALT-OF-2026-0418",
      blNumber: "MAEU583920147",
      containerNumber: "MSKU7841920",
      containerType: "40ft High-Cube",
      direction: "Import",
      carrier: "Maersk",
      vessel: "Maersk Sentosa",
      voyage: "508W",
      pol: "Shanghai",
      pod: "Rotterdam",
      terminal: "APM Terminals Maasvlakte II",
      trader: "Vandenberg Home & Living BV",
      traderType: "Importer",
      traderContact: "Eline Vandenberg",
      traderEmail: "eline@vandenberg-living.nl",
      phase: "Customs Hold",
      etd: isoDay(-31),
      eta: isoDay(-2),
      dischargedAt: isoFromNow(-60),
      freeDaysTotal: 4,
      freeTimeExpiresAt: isoFromNow(FREE_TIME_OFFSETS_H[0]),
      demurrageRatePerDay: 185,
      customsBlock: "Missing Commercial Invoice",
      teu: 2,
      weightKg: 18420,
      commodity: "Rattan furniture & home décor",
    },
    {
      id: "ALT-OF-2026-0421",
      blNumber: "MSCU9920481773",
      containerNumber: "MSCU8492019",
      containerType: "40ft Dry",
      direction: "Import",
      carrier: "MSC",
      vessel: "MSC Loreto",
      voyage: "FE412A",
      pol: "Ningbo",
      pod: "Antwerp",
      terminal: "MSC PSA European Terminal",
      trader: "Helios Electronics NV",
      traderType: "Importer",
      traderContact: "Joris Maes",
      traderEmail: "j.maes@helios-electronics.be",
      phase: "Discharged",
      etd: isoDay(-28),
      eta: isoDay(-1),
      dischargedAt: isoFromNow(-15),
      freeDaysTotal: 5,
      freeTimeExpiresAt: isoFromNow(FREE_TIME_OFFSETS_H[1]),
      demurrageRatePerDay: 210,
      customsBlock: null,
      teu: 2,
      weightKg: 21560,
      commodity: "Consumer electronics & accessories",
    },
    {
      id: "ALT-OF-2026-0423",
      blNumber: "CMAU4471209856",
      containerNumber: "CMAU6610337",
      containerType: "20ft Reefer",
      direction: "Import",
      carrier: "CMA CGM",
      vessel: "CMA CGM Bougainville",
      voyage: "0MX3W",
      pol: "Valencia",
      pod: "Rotterdam",
      terminal: "Rotterdam World Gateway",
      trader: "Noord Fresh Produce BV",
      traderType: "Importer",
      traderContact: "Sanne de Wit",
      traderEmail: "s.dewit@noordfresh.nl",
      phase: "Customs Hold",
      etd: isoDay(-12),
      eta: isoDay(-1),
      dischargedAt: isoFromNow(-20),
      freeDaysTotal: 3,
      freeTimeExpiresAt: isoFromNow(FREE_TIME_OFFSETS_H[2]),
      demurrageRatePerDay: 320,
      customsBlock: "Phytosanitary Certificate Missing",
      teu: 1,
      weightKg: 12880,
      commodity: "Chilled citrus fruit",
    },
    {
      id: "ALT-OF-2026-0426",
      blNumber: "HLCUSHA2204517",
      containerNumber: "HLXU8123094",
      containerType: "40ft Dry",
      direction: "Import",
      carrier: "Hapag-Lloyd",
      vessel: "Hapag Berlin Express",
      voyage: "229E",
      pol: "Qingdao",
      pod: "Antwerp",
      terminal: "DP World Antwerp Gateway",
      trader: "Brams Industrial Supplies BV",
      traderType: "Importer",
      traderContact: "Peter Brams",
      traderEmail: "peter@brams-industrial.be",
      phase: "Discharged",
      etd: isoDay(-26),
      eta: isoDay(-2),
      dischargedAt: isoFromNow(-30),
      freeDaysTotal: 5,
      freeTimeExpiresAt: isoFromNow(FREE_TIME_OFFSETS_H[3]),
      demurrageRatePerDay: 175,
      customsBlock: null,
      teu: 2,
      weightKg: 24010,
      commodity: "Steel fasteners & fittings",
    },
    {
      id: "ALT-OF-2026-0429",
      blNumber: "ONEYSHA51820930",
      containerNumber: "ONEU2934817",
      containerType: "40ft Reefer",
      direction: "Import",
      carrier: "ONE",
      vessel: "ONE Olympus",
      voyage: "041W",
      pol: "Shanghai",
      pod: "Rotterdam",
      terminal: "ECT Delta Terminal",
      trader: "Lumen Pharma Logistics BV",
      traderType: "Importer",
      traderContact: "Marit Joosten",
      traderEmail: "m.joosten@lumenpharma.nl",
      phase: "Customs Hold",
      etd: isoDay(-30),
      eta: isoDay(-3),
      dischargedAt: isoFromNow(-50),
      freeDaysTotal: 4,
      freeTimeExpiresAt: isoFromNow(FREE_TIME_OFFSETS_H[4]),
      demurrageRatePerDay: 295,
      customsBlock: "Certificate of Origin Hold",
      teu: 2,
      weightKg: 16740,
      commodity: "Temperature-controlled pharmaceuticals",
    },
    {
      id: "ALT-OF-2026-0431",
      blNumber: "EGLV142600318841",
      containerNumber: "EGHU9047712",
      containerType: "40ft High-Cube",
      direction: "Import",
      carrier: "Evergreen",
      vessel: "Ever Govern",
      voyage: "1184-051E",
      pol: "Kaohsiung",
      pod: "Rotterdam",
      terminal: "APM Terminals Maasvlakte II",
      trader: "Helios Electronics NV",
      traderType: "Importer",
      traderContact: "Joris Maes",
      traderEmail: "j.maes@helios-electronics.be",
      phase: "In Transit",
      etd: isoDay(-9),
      eta: isoDay(13),
      dischargedAt: null,
      freeDaysTotal: 5,
      freeTimeExpiresAt: isoFromNow(FREE_TIME_OFFSETS_H[5]),
      demurrageRatePerDay: 210,
      customsBlock: null,
      teu: 2,
      weightKg: 19980,
      commodity: "LED lighting modules",
    },
    {
      id: "ALT-OF-2026-0434",
      blNumber: "MAEU583991022",
      containerNumber: "MRKU5582910",
      containerType: "20ft Dry",
      direction: "Export",
      carrier: "Maersk",
      vessel: "Maersk Kowloon",
      voyage: "512E",
      pol: "Rotterdam",
      pod: "Singapore",
      terminal: "APM Terminals Maasvlakte II",
      trader: "Delta Machinery Export BV",
      traderType: "Exporter",
      traderContact: "Tom Hartman",
      traderEmail: "t.hartman@deltamachinery.nl",
      phase: "Booked",
      etd: isoDay(6),
      eta: isoDay(34),
      dischargedAt: null,
      freeDaysTotal: 7,
      freeTimeExpiresAt: isoFromNow(720),
      demurrageRatePerDay: 160,
      customsBlock: "Incomplete Bill of Lading",
      teu: 1,
      weightKg: 9450,
      commodity: "Precision machinery parts",
    },
    {
      id: "ALT-OF-2026-0436",
      blNumber: "CMAU4471330017",
      containerNumber: "CMAU7781450",
      containerType: "40ft Dry",
      direction: "Export",
      carrier: "CMA CGM",
      vessel: "CMA CGM Jacques Saadé",
      voyage: "0CX9E",
      pol: "Antwerp",
      pod: "New York",
      terminal: "MSC PSA European Terminal",
      trader: "Flandria Food Group NV",
      traderType: "Exporter",
      traderContact: "Karel Dewulf",
      traderEmail: "k.dewulf@flandriafood.be",
      phase: "In Transit",
      etd: isoDay(-7),
      eta: isoDay(5),
      dischargedAt: null,
      freeDaysTotal: 6,
      freeTimeExpiresAt: isoFromNow(600),
      demurrageRatePerDay: 190,
      customsBlock: null,
      teu: 2,
      weightKg: 22300,
      commodity: "Packaged confectionery",
    },
    {
      id: "ALT-OF-2026-0438",
      blNumber: "MSCU9931200548",
      containerNumber: "MEDU3398721",
      containerType: "20ft Dry",
      direction: "Export",
      carrier: "MSC",
      vessel: "MSC Ambra",
      voyage: "FE551E",
      pol: "Rotterdam",
      pod: "Shanghai",
      terminal: "ECT Delta Terminal",
      trader: "Delta Machinery Export BV",
      traderType: "Exporter",
      traderContact: "Tom Hartman",
      traderEmail: "t.hartman@deltamachinery.nl",
      phase: "Released",
      etd: isoDay(-3),
      eta: isoDay(27),
      dischargedAt: null,
      freeDaysTotal: 7,
      freeTimeExpiresAt: isoFromNow(540),
      demurrageRatePerDay: 160,
      customsBlock: null,
      teu: 1,
      weightKg: 8870,
      commodity: "Hydraulic components",
    },
    {
      id: "ALT-OF-2026-0440",
      blNumber: "HLCUSHA2240881",
      containerNumber: "HLBU7740921",
      containerType: "40ft Dry",
      direction: "Import",
      carrier: "Hapag-Lloyd",
      vessel: "Hapag Rome Express",
      voyage: "233E",
      pol: "Busan",
      pod: "Rotterdam",
      terminal: "Rotterdam World Gateway",
      trader: "Vandenberg Home & Living BV",
      traderType: "Importer",
      traderContact: "Eline Vandenberg",
      traderEmail: "eline@vandenberg-living.nl",
      phase: "Delivered",
      etd: isoDay(-44),
      eta: isoDay(-14),
      dischargedAt: isoFromNow(-300),
      freeDaysTotal: 5,
      freeTimeExpiresAt: isoFromNow(-220),
      demurrageRatePerDay: 175,
      customsBlock: null,
      teu: 2,
      weightKg: 20140,
      commodity: "Textile & soft furnishings",
    },
    {
      id: "ALT-OF-2026-0442",
      blNumber: "ONEYSHA51877104",
      containerNumber: "ONEU3120954",
      containerType: "40ft Dry",
      direction: "Import",
      carrier: "ONE",
      vessel: "ONE Hangzhou Bay",
      voyage: "047W",
      pol: "Yantian",
      pod: "Antwerp",
      terminal: "DP World Antwerp Gateway",
      trader: "Brams Industrial Supplies BV",
      traderType: "Importer",
      traderContact: "Peter Brams",
      traderEmail: "peter@brams-industrial.be",
      phase: "In Transit",
      etd: isoDay(-5),
      eta: isoDay(18),
      dischargedAt: null,
      freeDaysTotal: 5,
      freeTimeExpiresAt: isoFromNow(900),
      demurrageRatePerDay: 175,
      customsBlock: null,
      teu: 2,
      weightKg: 23110,
      commodity: "Power tools & equipment",
    },
    {
      id: "ALT-OF-2026-0444",
      blNumber: "MAEU584100923",
      containerNumber: "MSKU8890214",
      containerType: "20ft Reefer",
      direction: "Import",
      carrier: "Maersk",
      vessel: "Maersk Sentosa",
      voyage: "508W",
      pol: "Cartagena",
      pod: "Rotterdam",
      terminal: "ECT Delta Terminal",
      trader: "Noord Fresh Produce BV",
      traderType: "Importer",
      traderContact: "Sanne de Wit",
      traderEmail: "s.dewit@noordfresh.nl",
      phase: "Discharged",
      etd: isoDay(-16),
      eta: isoDay(-1),
      dischargedAt: isoFromNow(-10),
      freeDaysTotal: 3,
      freeTimeExpiresAt: isoFromNow(52),
      demurrageRatePerDay: 320,
      customsBlock: null,
      teu: 1,
      weightKg: 11460,
      commodity: "Chilled avocados",
    },
    {
      id: "ALT-OF-2026-0446",
      blNumber: "MSCU9942011887",
      containerNumber: "MEDU4471203",
      containerType: "40ft High-Cube",
      direction: "Import",
      carrier: "MSC",
      vessel: "MSC Loreto",
      voyage: "FE412A",
      pol: "Tanjung Pelepas",
      pod: "Antwerp",
      terminal: "MSC PSA European Terminal",
      trader: "Helios Electronics NV",
      traderType: "Importer",
      traderContact: "Joris Maes",
      traderEmail: "j.maes@helios-electronics.be",
      phase: "Customs Hold",
      etd: isoDay(-29),
      eta: isoDay(-2),
      dischargedAt: isoFromNow(-44),
      freeDaysTotal: 5,
      freeTimeExpiresAt: isoFromNow(30),
      demurrageRatePerDay: 210,
      customsBlock: "Packing List Discrepancy",
      teu: 2,
      weightKg: 17890,
      commodity: "Networking hardware",
    },
    {
      id: "ALT-OF-2026-0448",
      blNumber: "EGLV142600412290",
      containerNumber: "EITU1209845",
      containerType: "40ft Dry",
      direction: "Import",
      carrier: "Evergreen",
      vessel: "Ever Govern",
      voyage: "1184-051E",
      pol: "Laem Chabang",
      pod: "Rotterdam",
      terminal: "Rotterdam World Gateway",
      trader: "Flandria Food Group NV",
      traderType: "Importer",
      traderContact: "Karel Dewulf",
      traderEmail: "k.dewulf@flandriafood.be",
      phase: "Customs Hold",
      etd: isoDay(-33),
      eta: isoDay(-2),
      dischargedAt: isoFromNow(-66),
      freeDaysTotal: 4,
      freeTimeExpiresAt: isoFromNow(80),
      demurrageRatePerDay: 190,
      customsBlock: "Pending Duty Payment",
      teu: 2,
      weightKg: 19230,
      commodity: "Canned food goods",
    },
  ];
}

/** Customer status-update emails for the Smart Communication Hub. */
export function buildCustomerEmails(): CustomerEmail[] {
  return [
    {
      id: "EML-7741",
      fromName: "Eline Vandenberg",
      fromCompany: "Vandenberg Home & Living BV",
      fromEmail: "eline@vandenberg-living.nl",
      subject: "Status update — container MSKU7841920?",
      body: "Hi, our showroom restock depends on this container. Customs still shows a hold — what is missing and when can we expect release? Thanks, Eline",
      receivedAt: isoFromNow(-3),
      shipmentId: "ALT-OF-2026-0418",
      intent: "Status Update",
      aiDraft:
        "Dear Eline,\n\nThank you for reaching out about container MSKU7841920 (booking ALT-OF-2026-0418, B/L MAEU583920147).\n\nThe shipment was discharged at APM Terminals Maasvlakte II and is currently on a customs hold: the Commercial Invoice is missing from the declaration file. We have requested it from the exporter and will lodge the declaration the moment it arrives.\n\nPlease note free time at the terminal has now expired, so demurrage is accruing at EUR 185/day — we are prioritising release to limit this cost.\n\nWe will confirm release within 24 hours of receiving the invoice.\n\nKind regards,\nAltun Logistics — Customer Service",
    },
    {
      id: "EML-7748",
      fromName: "Joris Maes",
      fromCompany: "Helios Electronics NV",
      fromEmail: "j.maes@helios-electronics.be",
      subject: "ETA for MSC Loreto shipment",
      body: "Could you confirm the latest ETA for our electronics container arriving in Antwerp? We need to schedule the unloading crew. Regards, Joris",
      receivedAt: isoFromNow(-7),
      shipmentId: "ALT-OF-2026-0421",
      intent: "ETA Request",
      aiDraft:
        "Dear Joris,\n\nThank you for your message regarding booking ALT-OF-2026-0421 (container MSCU8492019).\n\nThe MSC Loreto (voyage FE412A) has arrived and the container is discharged at the MSC PSA European Terminal in Antwerp. Customs is clear — no documentation holds.\n\nTerminal free time expires soon, so we recommend scheduling collection within the next 24 hours to avoid demurrage at EUR 210/day. We can arrange trucking on request.\n\nKind regards,\nAltun Logistics — Customer Service",
    },
    {
      id: "EML-7752",
      fromName: "Sanne de Wit",
      fromCompany: "Noord Fresh Produce BV",
      fromEmail: "s.dewit@noordfresh.nl",
      subject: "Reefer citrus — urgent, cold chain at risk",
      body: "Our chilled citrus container is showing a customs hold. This is perishable cargo, please advise immediately what is blocking release.",
      receivedAt: isoFromNow(-2),
      shipmentId: "ALT-OF-2026-0423",
      intent: "Document Request",
      aiDraft:
        "Dear Sanne,\n\nThank you for flagging the urgency on container CMAU6610337 (booking ALT-OF-2026-0423).\n\nThe reefer is plugged in at Rotterdam World Gateway, so the cold chain is maintained. The customs hold is due to a missing Phytosanitary Certificate. We have escalated the request to the exporter and the NVWA inspection slot is pre-booked so we can clear immediately on receipt.\n\nGiven free time expires within ~19 hours, we are treating this as priority and will update you the moment the certificate is in.\n\nKind regards,\nAltun Logistics — Customer Service",
    },
    {
      id: "EML-7759",
      fromName: "Marit Joosten",
      fromCompany: "Lumen Pharma Logistics BV",
      fromEmail: "m.joosten@lumenpharma.nl",
      subject: "Demurrage charges on pharma reefer?",
      body: "We received a notice about possible demurrage on our pharmaceutical container. Can you confirm the current free-day situation and expected costs?",
      receivedAt: isoFromNow(-11),
      shipmentId: "ALT-OF-2026-0429",
      intent: "Demurrage Query",
      aiDraft:
        "Dear Marit,\n\nThank you for your enquiry on booking ALT-OF-2026-0429 (container ONEU2934817).\n\nThe container is discharged at ECT Delta Terminal with approximately 62 hours of free time remaining. There are currently no demurrage charges. A customs hold (Certificate of Origin) is open — clearing it before free time expires will avoid the EUR 295/day demurrage rate.\n\nWe have requested the Certificate of Origin and will keep you posted; no action is needed from your side.\n\nKind regards,\nAltun Logistics — Customer Service",
    },
    {
      id: "EML-7763",
      fromName: "Peter Brams",
      fromCompany: "Brams Industrial Supplies BV",
      fromEmail: "peter@brams-industrial.be",
      subject: "Where is our Hapag-Lloyd container?",
      body: "Just checking in on our power-tools shipment from Yantian — any tracking update would be appreciated.",
      receivedAt: isoFromNow(-26),
      shipmentId: "ALT-OF-2026-0442",
      intent: "Status Update",
      aiDraft:
        "Dear Peter,\n\nThank you for your message about booking ALT-OF-2026-0442 (container ONEU3120954).\n\nThe ONE Hangzhou Bay (voyage 047W) is currently in transit from Yantian to Antwerp, with an estimated arrival at DP World Antwerp Gateway in about 18 days. Customs pre-clearance is already prepared, so we expect a smooth release on arrival.\n\nWe will send a discharge confirmation as soon as the vessel berths.\n\nKind regards,\nAltun Logistics — Customer Service",
    },
  ];
}
