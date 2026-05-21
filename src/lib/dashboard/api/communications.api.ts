/**
 * Communications API — Supabase-first, mock-fallback.
 *
 * Table: `communications`
 *   id           text PK
 *   from_name    text
 *   from_email   text
 *   subject      text
 *   body         text
 *   preview      text
 *   tag          text  (D&D Alert | Missing Doc | Carrier | Finance | Customs | Booking)
 *   status       text  (unread | read | archived)
 *   shipment_id  text nullable → references shipments(id)
 *   received_at  timestamptz
 */

import { simulateRead, delay } from "./client";
import { supabase, withSupabaseFallback } from "./supabase";

/* ── Types ─────────────────────────────────────────────────────────────── */

export type MessageStatus = "unread" | "read" | "archived";

export type MessageTag =
  | "D&D Alert"
  | "Missing Doc"
  | "Carrier"
  | "Finance"
  | "Customs"
  | "Booking";

export interface CommunicationMessage {
  id: string;
  from: string;
  email: string;
  subject: string;
  body: string;
  preview: string;
  tag: MessageTag;
  status: MessageStatus;
  /** Human-readable shipment ref (e.g. "AL-2026-1041"), or null if not linked. */
  shipmentId: string | null;
  receivedAt: string; // ISO timestamp
}

export interface SendReplyInput {
  messageId: string;
  body: string;
}

/* ── Mock data ─────────────────────────────────────────────────────────── */

const MOCK_MESSAGES: CommunicationMessage[] = [
  {
    id: "MSG-2026-001",
    from: "Demir Industrial Trading",
    email: "ops@demir-industrial.com",
    subject: "Re: Container MSCU4821033 — ETA update & D&D exposure",
    preview:
      "Can you confirm the revised ETA and whether demurrage charges have started accruing…",
    body: `Dear Altun Logistics team,

Following our call yesterday, we need urgent clarification on the current status of container MSCU4821033 linked to shipment AL-2026-1041.

Our records show the vessel arrived at Rotterdam (ECT Delta) on May 14th, but we have not received confirmation of the container gate-out. Based on the 7 free-day allowance in our contract, demurrage would have started accruing on May 21st.

Could you please confirm:
1. Current container status (in-terminal / on hold / gated out)
2. Whether demurrage charges are accruing and the current exposure in EUR
3. The revised ETA to our Venlo warehouse, taking into account customs clearance

We need to update our production schedule by end of day. Please advise as soon as possible.

Kind regards,
Ahmet Demir
Operations Manager, Demir Industrial Trading`,
    tag: "D&D Alert",
    status: "unread",
    shipmentId: "AL-2026-1041",
    receivedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
  {
    id: "MSG-2026-002",
    from: "Van der Berg Logistics",
    email: "planning@vanderberg.nl",
    subject: "Document request — Packing list missing for AL-2026-1038",
    preview:
      "We are still missing the packing list for the above shipment. Customs pre-clearance cannot proceed…",
    body: `Good morning,

We are handling customs clearance on behalf of our client for shipment AL-2026-1038 (B/L COSU6841203050).

As of this morning, we are still missing the following document:
- Commercial packing list (signed copy)

The Bill of Lading and Commercial Invoice have been received and verified. However, without the packing list, Dutch Customs (Douane) will not proceed with the pre-clearance declaration. The container is scheduled for vessel discharge on May 22nd and delay will trigger terminal holding fees.

Please send the packing list to this email address at your earliest convenience. If the shipper has not yet issued this document, we recommend contacting them directly and copying us on the correspondence.

Regards,
Marieke van der Berg
Customs & Compliance, Van der Berg Logistics BV`,
    tag: "Missing Doc",
    status: "unread",
    shipmentId: "AL-2026-1038",
    receivedAt: new Date(Date.now() - 4 * 3_600_000).toISOString(),
  },
  {
    id: "MSG-2026-003",
    from: "Maersk Line",
    email: "customerservice@maersk.com",
    subject: "Vessel departure confirmed — EVER GIVEN II / Voy. AX2614E",
    preview:
      "This is to confirm that EVER GIVEN II has departed Port Said on May 17th and is en route to Rotterdam…",
    body: `Dear Valued Customer,

This is an automated service notification from Maersk Line.

Vessel: EVER GIVEN II
Voyage: AX2614E
Departure port: Port Said (EGPSD)
Departure date/time: 17 May 2026 at 22:45 UTC

Next port of call: Rotterdam (NLRTM)
Estimated arrival: 26 May 2026

Your booking reference(s) on this voyage:
- MAEU-BKG-2026-89341 (3x 40'HC — Altun Logistics)

Please note that the vessel is currently running approximately 14 hours ahead of the original schedule. Updated ETAs will be reflected in the Maersk Track & Trace portal within 6 hours.

For cargo insurance and documentation queries, please contact your local Maersk office.

This is an automated message. Please do not reply directly to this email.

Maersk Customer Service
www.maersk.com`,
    tag: "Carrier",
    status: "read",
    shipmentId: null,
    receivedAt: new Date(Date.now() - 28 * 3_600_000).toISOString(),
  },
  {
    id: "MSG-2026-004",
    from: "Yıldız Makina A.Ş.",
    email: "lojistik@yildizmakina.com.tr",
    subject: "Invoice dispute — Demurrage charge AL-2026-1035",
    preview:
      "We believe the demurrage charge applied to invoice ALT-INV-2026-0447 is incorrect based on the agreed free days…",
    body: `Sayın Altun Lojistik yetkilileri,

AL-2026-1035 sevkiyatı için tarafımıza kesilen ALT-INV-2026-0447 no'lu faturada yer alan demurrage bedeline itiraz etmek zorundayız.

Sözleşmemizde (Kontrat no: AL-TR-2024-019) 10 günlük free time süresi kararlaştırılmış olmasına rağmen faturada yalnızca 7 günlük free time hesaba katılmıştır. Bu durumda tarafımıza fazladan 3 günlük demurrage (€ 480 x 3 = € 1.440) yansıtılmış olmaktadır.

Ekte ilgili kontrat sayfasını ve konşimento tarihlerini gösteren belgeleri sunuyoruz. Düzeltilmiş bir fatura düzenlenmesini talep ediyoruz.

Bu konudaki görüşlerinizi en kısa sürede bekliyoruz.

Saygılarımızla,
Kemal Yıldız
Lojistik Müdürü, Yıldız Makina A.Ş.

---

Dear Altun Logistics,

We are writing to dispute the demurrage charge on invoice ALT-INV-2026-0447 for shipment AL-2026-1035. Our contract specifies 10 free days, but only 7 were applied, resulting in an overcharge of € 1,440. Please issue a corrected invoice at your earliest convenience.

K. Yıldız`,
    tag: "Finance",
    status: "read",
    shipmentId: "AL-2026-1035",
    receivedAt: new Date(Date.now() - 30 * 3_600_000).toISOString(),
  },
  {
    id: "MSG-2026-005",
    from: "Dutch Customs (Douane)",
    email: "noreply@belastingdienst.nl",
    subject: "Customs hold — Additional inspection AL-2026-1042",
    preview:
      "Container TCKU3912847 has been flagged for a physical inspection. Please present the goods at…",
    body: `AUTOMATED NOTIFICATION — DOUANE NEDERLAND

Customs Reference: NL-CUST-2026-449821
B/L Number: CMDU5620041890
Container: TCKU3912847
Importer: Altun Logistics BV (EORI: NL823456789B01)

The above-mentioned shipment has been selected for a PHYSICAL INSPECTION under Article 46 of the Union Customs Code (Regulation EU 952/2013).

Inspection appointment:
Date: 23 May 2026
Time: 08:00–10:00
Location: ECT Delta Terminal, Gate 8, Rotterdam

Please ensure the container is de-stuffed and goods are accessible. The following documents must be presented in original:
- Bill of Lading
- Commercial Invoice
- Packing List
- Certificate of Origin
- EUR.1 Movement Certificate (if applicable)

Failure to present the goods within the scheduled window may result in a penalty and extended customs hold. For queries, contact the Douane Helpdesk at +31 88 1512 100.

This is an automated message from Belastingdienst / Douane.`,
    tag: "Customs",
    status: "unread",
    shipmentId: "AL-2026-1042",
    receivedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
  },
  {
    id: "MSG-2026-006",
    from: "MSC Mediterranean Shipping",
    email: "ops-rotterdam@msc.com",
    subject: "Free time expiry notice — MSCU4821033 / Rotterdam ECT",
    preview:
      "This is a courtesy notification that the free time period for container MSCU4821033 expires in 48 hours…",
    body: `Dear Altun Logistics,

This is a courtesy notification regarding container MSCU4821033 currently held at ECT Delta Terminal, Rotterdam.

Free time expiry: 21 May 2026 at 23:59 local time

After this date, demurrage will accrue at a rate of EUR 95 per day (20' equivalent) until the container is gated out.

To avoid charges, please ensure gate-out is completed before the expiry date. If you require a free time extension, please contact MSC Customer Service before the expiry date. Extensions are subject to availability and carrier approval.

Demurrage invoicing is handled via our eCommerce portal at www.msc.com/demurrage.

MSC Rotterdam Customer Service
T: +31 10 400 2000`,
    tag: "D&D Alert",
    status: "unread",
    shipmentId: "AL-2026-1041",
    receivedAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
  },
  {
    id: "MSG-2026-007",
    from: "Teknopar Industrial",
    email: "supply@teknopar.com.tr",
    subject: "New booking request — 2x 40'HC Istanbul → Rotterdam",
    preview:
      "We would like to book 2 x 40'HC containers for a shipment of CNC machinery from Istanbul to Rotterdam…",
    body: `Dear Altun Logistics team,

We would like to proceed with a new ocean freight booking for the following shipment:

Origin: Istanbul, Turkey (Ambarlı Port)
Destination: Rotterdam, Netherlands (ECT Delta)
Cargo: 2 x 40'HC — CNC machining centres (HS code: 8457.10)
Gross weight: approx. 38,000 kg per container
Preferred departure: first available sailing after 01 June 2026
Incoterm: CFR Rotterdam

We require ISPM-15 compliant wooden packing. Cargo value declared at USD 740,000 per container — please advise on cargo insurance options.

Could you provide us with a spot rate and the next available booking slot? We need to confirm by May 26th to align with our production handover schedule.

Best regards,
Serhat Aydın
Supply Chain Director, Teknopar Industrial`,
    tag: "Booking",
    status: "read",
    shipmentId: null,
    receivedAt: new Date(Date.now() - 52 * 3_600_000).toISOString(),
  },
  {
    id: "MSG-2026-008",
    from: "Anadolu Çelik Endüstrisi",
    email: "export@anadolusteel.com.tr",
    subject: "Document upload: B/L + Cert. of Origin for AL-2026-1039",
    preview:
      "Please find attached the original Bill of Lading and EUR.1 Certificate of Origin for the above shipment…",
    body: `Dear Altun Logistics,

Further to our earlier communication, please find attached:

1. Original Bill of Lading — COSU6841209011 (telex release authorised)
2. EUR.1 Movement Certificate — Serial no. A 4892031
3. Packing List (final, signed)
4. Commercial Invoice — ACS-INV-2026-0341

All documents relate to shipment AL-2026-1039 (2 x 20' containers, hot-rolled coil, 58,400 kg).

Please confirm receipt and advise whether any further documents are required for Dutch customs clearance. We understand clearance is targeted for May 28th.

Note: the EUR.1 was issued by the Istanbul Chamber of Commerce and is valid for origin preference under the EU-Turkey Customs Union.

With kind regards,
Fatma Koç
Export Documentation, Anadolu Çelik Endüstrisi A.Ş.`,
    tag: "Missing Doc",
    status: "read",
    shipmentId: "AL-2026-1039",
    receivedAt: new Date(Date.now() - 72 * 3_600_000).toISOString(),
  },
];

/* ── Supabase row ──────────────────────────────────────────────────────── */

interface CommunicationRow {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  body: string;
  preview: string;
  tag: string;
  status: string;
  shipment_id: string | null;
  received_at: string;
}

function rowToMessage(row: CommunicationRow): CommunicationMessage {
  return {
    id: row.id,
    from: row.from_name,
    email: row.from_email,
    subject: row.subject,
    body: row.body,
    preview: row.preview,
    tag: row.tag as MessageTag,
    status: row.status as MessageStatus,
    shipmentId: row.shipment_id,
    receivedAt: row.received_at,
  };
}

/* ── API functions ─────────────────────────────────────────────────────── */

/** Fetch all non-archived messages, newest first. */
export async function getCommunications(): Promise<CommunicationMessage[]> {
  return withSupabaseFallback(
    "getCommunications",
    async () => {
      const { data, error } = await supabase!
        .from("communications")
        .select(
          "id, from_name, from_email, subject, body, preview, tag, status, shipment_id, received_at",
        )
        .neq("status", "archived")
        .order("received_at", { ascending: false });

      if (error) throw error;
      return (data as CommunicationRow[]).map(rowToMessage);
    },
    () =>
      simulateRead(() =>
        MOCK_MESSAGES.filter((m) => m.status !== "archived"),
      ),
  );
}

/** Mark a single message as read. No-op if already read. */
export async function markAsRead(id: string): Promise<void> {
  await withSupabaseFallback(
    "markAsRead",
    async () => {
      const { error } = await supabase!
        .from("communications")
        .update({ status: "read" })
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    () => delay(60).then(() => true),
  );
}

/** Archive a message (removes it from the default inbox view). */
export async function archiveMessage(id: string): Promise<void> {
  await withSupabaseFallback(
    "archiveMessage",
    async () => {
      const { error } = await supabase!
        .from("communications")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    () => delay(100).then(() => true),
  );
}

/** Send a reply. In production this would trigger an email via an Edge Function. */
export async function sendReply(input: SendReplyInput): Promise<void> {
  await withSupabaseFallback(
    "sendReply",
    async () => {
      // Real: POST to /functions/v1/send-reply with input
      // For now: mark original as read
      const { error } = await supabase!
        .from("communications")
        .update({ status: "read" })
        .eq("id", input.messageId);
      if (error) throw error;
      return true;
    },
    () => delay(400).then(() => true),
  );
}
