/**
 * Altun Logistics AI Co-Pilot — chat service.
 *
 * Two modes selected automatically at runtime:
 *
 *   LIVE  — `VITE_OPENAI_API_KEY` is set in the environment.
 *           Calls `gpt-4o-mini` with a logistics-specialist system prompt.
 *           ⚠️  Note: exposing an API key client-side is acceptable for an
 *           internal demo behind auth, but for production route requests
 *           through a server-side proxy instead.
 *
 *   DEMO  — No API key. Returns pre-written, context-aware mock responses
 *           with a simulated typing delay so the widget feels real.
 *
 * Callers never need to check which mode is active — the interface is
 * identical in both cases.
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendOptions {
  /** Human-readable label of the currently visible page. */
  pageContext?: string;
  /** Last N messages to include as conversation history (OpenAI only). */
  history?: ChatMessage[];
}

/* ── System prompt ───────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `\
You are the Altun Logistics AI Co-Pilot — an expert logistics assistant for \
Altun Logistics, a Dutch ocean-freight forwarder specialising in the \
Turkey–Netherlands trade lane.

Your role is to support operations staff (planners, customs declarants, \
customer-service agents) with day-to-day tasks:
  • Customs hold resolution and document drafting
  • Demurrage & detention risk analysis and escalation
  • Client communication drafts (status updates, delay notices, ETA emails)
  • Free-time and terminal SLA explanations
  • Shipment status summaries

Communication style:
  • Concise, professional, and actionable — no waffle
  • Structure longer answers with short headings or numbered lists
  • When drafting emails, wrap them in --- delimiters and mark editable fields [like this]
  • Flag urgent items clearly with ⚠️ or a CRITICAL label

Current page context will be provided in each message.`;

function buildSystemPrompt(pageContext: string): string {
  return `${SYSTEM_PROMPT}\n\nCurrent page: ${pageContext}`;
}

/* ── Mock response library ───────────────────────────────────────────────── */

const CUSTOMS_RESPONSES = [
  `The most common resolution path for a Turkey–EU customs hold:

**Root cause analysis:**
Documentation gaps are responsible for ~78% of holds on this lane. The most frequent: missing EUR.1 movement certificate, non-compliant commercial invoice, or packing list weight discrepancy.

**Immediate steps:**
1. Identify the exact flag in the declaration (visible in the Customs Action Center).
2. Contact the shipper and request corrected documents — invoice must include HS codes, unit values in EUR, incoterms, and country of origin.
3. Attach EUR.1 or REX statement of origin to claim preferential duty under the EU–Turkey Customs Union.
4. Submit corrected documents via the Action Center — your declarant will re-lodge within 2 hours.

**Dutch Customs (Douane) SLA:** Holds cleared in 4–8 business hours once compliant paperwork is received.

Shall I draft the document request to the shipper?`,

  `Here's a structured approach to clear the current customs hold:

**1. Classify the hold type:**
   • Document hold → submit missing paperwork (fastest resolution)
   • Tariff hold → may require a Binding Tariff Information (BTI) ruling
   • Physical inspection → arrange with terminal, adds 1–3 days

**2. For a document hold (most likely):**
   • Request corrected commercial invoice from shipper — key fields: HS-8 codes, EUR unit price, net/gross weight, incoterms (CIF Rotterdam).
   • Attach Packing List with package count matching the B/L.

**3. Submit to Douane via ICS2 / NCTS amendment:**
   Your declarant will handle the re-submission; no new duties unless the HS code changes.

**Timeline:** 6–10 hours from corrected document submission.

Want me to generate the corrected invoice checklist or draft the shipper request?`,
];

const DEMURRAGE_RESPONSES = [
  `Demurrage risk breakdown for your current containers:

**What's at stake:**
Demurrage accrues daily once the carrier's free time expires at the terminal — typically 5–14 days depending on the service contract.

**Rotterdam ECT Delta — current conditions:**
• Terminal congestion: MODERATE
• Truck appointment availability: Same-day slots still available
• Average gate-out time: 45–60 minutes once appointment confirmed

**Escalation matrix:**
   0–24 h remaining → Book collection NOW + request carrier extension
   Already expired   → Pre-approve costs, dispute if terminal caused delay
   Extension request → Success rate ~68% for first-time requests; cite "port congestion" as reason

**Cost exposure formula:**
   Daily rate (e.g., €185/day) × days beyond free time = accrued cost
   The clock stops the moment the empty is returned to the nominated depot.

Shall I draft the free-time extension request to the carrier?`,

  `Demurrage & Detention explained for this shipment:

**Demurrage** = charge for leaving a full container at the terminal beyond the carrier's free days.
**Detention** = charge for keeping the container outside the terminal beyond free days (i.e., at your client's warehouse).

**Typical free-time allocation on Turkey–NL lane:**
   Maersk / MSC: 10–14 days at Rotterdam (import)
   Hapag-Lloyd: 7 days standard, extendable to 14 days on request

**How to stop the clock:**
   Demurrage: arrange truck collection and gate-out the full container.
   Detention: return the empty to the nearest nominated depot.

**Dispute eligibility:**
   If the terminal contributed to the delay (e.g., congestion, equipment shortage), you can dispute up to 100% of the charge. Keep all truck appointment confirmation emails as evidence.

Need help drafting a demurrage dispute letter or a free-time extension request?`,
];

const EMAIL_RESPONSES = [
  `Here's a client delay notification draft — edit the bracketed fields before sending:

---
Subject: Shipment Status Update — Customs Clearance Delay | [Booking Reference]

Dear [Client Contact Name],

I hope this message finds you well.

I'm writing to keep you informed about your shipment currently at Rotterdam.

Reference: [Booking ID] | B/L: [B/L Number]
Current status: Pending customs clearance at Rotterdam (Douane)
Reason: Routine documentation review — no action is required on your end

Revised estimated delivery to your facility: [Original ETA + 2 business days]

Our operations team is actively working with customs authorities to expedite release. We will provide a further update within 24 hours, or immediately once clearance is confirmed.

We sincerely apologise for any disruption to your planning and appreciate your continued trust in Altun Logistics.

Best regards,
[Your Name]
Operations Department | Altun Logistics
T: +31 (0)10 123 4567
---

Options: adjust tone (more formal / more casual), translate to Dutch or Turkish, or add specific container and terminal details. Just ask.`,

  `Here's a demurrage advisory email to your client:

---
Subject: Urgent — Additional Charges Notice | [Shipment Reference]

Dear [Client Name],

I need to bring an urgent matter to your attention regarding your shipment [Booking ID].

Situation:
Your container [Container Number] has exceeded the carrier's free-time allowance at Rotterdam terminal. Demurrage charges are now accruing at €[Rate]/day.

Accrued to date: €[Amount]
Estimated total if collected by [Date]: €[Projected Total]

Required action:
To minimise further charges, please confirm your collection arrangement at your earliest convenience. Our operations team can assist with booking a truck appointment — please reply to this email or call us directly.

We are also exploring whether a free-time extension can be requested from the carrier on your behalf.

Please don't hesitate to contact us immediately if you have any questions.

Kind regards,
[Your Name]
Altun Logistics | Operations
---

Shall I also prepare the carrier extension request in parallel?`,
];

const SHIPMENT_RESPONSES = [
  `Here's what I can tell you about this shipment:

**Status overview:**
Based on the current phase, this shipment is progressing through the standard Turkey–Rotterdam corridor. Typical transit time on this lane is 18–22 days depending on carrier and routing.

**Key checkpoints:**
   ✓ Booking confirmed and B/L issued
   ✓ Container loaded and vessel departed POL
   → Next milestone: Arrival at Rotterdam, customs clearance, delivery

**Potential risks to monitor:**
   • Suez Canal transit: standard routing adds 1 day buffer for schedule variance
   • Rotterdam congestion index: currently MODERATE — no significant berthing delays expected
   • Customs: ensure all documents are pre-lodged before vessel arrival to avoid holds

**Recommended actions:**
   • Confirm truck availability for the ETA window
   • Pre-lodge customs declaration if not already submitted
   • Notify client of ETA and any updates

Would you like me to draft a client ETA notification or flag any documentation gaps?`,
];

const GENERAL_RESPONSES = [
  `I'm your Altun Logistics Co-Pilot. Here's what I can help with:

**Operations & Risk:**
   • Analyse customs holds and map the fastest resolution path
   • Calculate demurrage exposure and model escalation costs
   • Explain free-time SLAs and terminal-specific rules

**Communications:**
   • Draft client delay and ETA update emails
   • Write document request letters to shippers
   • Prepare demurrage dispute correspondence

**Analytics & Planning:**
   • Summarise your workload and prioritise exceptions
   • Identify patterns in customs holds by carrier or commodity
   • Flag high-risk shipments for proactive intervention

What would you like to tackle first?`,

  `Based on typical workload patterns on the Turkey–NL lane, here are the items most likely to need your attention today:

**⚠️ Critical (action today):**
   • Containers at demurrage risk — free time < 24 hours
   • Customs holds pending > 48 hours (approaching escalation threshold)

**High priority:**
   • Discharged containers with no confirmed collection booking
   • Client emails awaiting response for > 3 business days

**Routine:**
   • In-transit shipments — standard progress, no action needed
   • Weekly B/L audit — check for discrepancies before vessel arrival

Shall I help you work through any of these? Start by telling me which shipment or issue is most pressing.`,

  `A few things I can do right now:

1. **Explain a customs hold** — paste the hold reason and I'll give you the resolution path.
2. **Draft an email** — tell me who it's to and what the situation is.
3. **Analyse demurrage risk** — I can walk you through the cost calculation and mitigation options.
4. **Summarise a shipment** — share the reference and I'll outline the key facts and next steps.

What's on your plate?`,
];

const DOSSIER_EMAIL_RESPONSE = `I have generated the draft below. Notice the subject line includes both the **Dossier ID** and a unique **Ticket ID** for automated routing — this ensures replies are automatically filed to dossier AL-2026-1041 without manual triage, replacing the legacy Alaska email ticket system.

---

**Subject:** Delay Notice | [Dossier: AL-2026-1041] [TKT-8992]

**To:** procurement@demir-industrial.com
**CC:** operations@altun-logistics.com

> ⚙️ **Smart Threading active** — subject line tags "[Dossier: AL-2026-1041]" and "[TKT-8992]" ensure any reply is automatically routed to this dossier without manual sorting.

Dear [Client Name],

I am writing to provide you with a progress update on dossier **AL-2026-1041** for the above-referenced shipment.

**Current status:** Container MSCU4821033 (40'HC) was discharged at ECT Delta, Rotterdam, on 18 May 2026. The shipment is currently in the customs inspection queue.

**Action required from your side:**
- Confirm the packing list quantities match the commercial invoice (discrepancy flagged on lines 3–5).
- Provide the EUR.1 preferential origin certificate for the textile goods (HS 6204) to claim the EU–Turkey Customs Union preference rate.

**Next steps (our side):**
We will re-lodge the customs entry as soon as the corrected documents are received. Estimated clearance: 6–8 business hours after submission.

**Demurrage note:** Free time on this container expires **21 May 2026**. We recommend arranging truck collection for 22 May to avoid charges (current rate: €1,050/day).

Please do not hesitate to contact me if you have any questions.

Kind regards,
[Your name]
Altun Logistics B.V.
📞 +31 (0)10 XXX XXXX

---

> **Routing note:** The subject line format "Delay Notice | [Dossier: AL-2026-1041] [TKT-8992]" is required for Smart Threading. Any reply to this email will be **automatically parsed and filed** to dossier AL-2026-1041 — no manual routing needed. Do not remove the tags when forwarding.`;

const SOP_BILLING_RESPONSE = `Here are the billing SOPs for **Demir Industrial Trading** (dossier AL-2026-1041):

---

**Client billing profile — Demir Industrial Trading**

**Currency:** EUR (all invoices)
**Payment terms:** Net 28 days from invoice date
**Billing frequency:** Per dossier (one invoice per completed shipment)
**Invoice trigger:** Issue sales invoice within 48h of customs release or delivery, whichever comes first.

---

**Chargeable services (per agreement):**

| Service | Rate | Notes |
|---|---|---|
| Ocean freight (FCL) | Cost + 12% margin | Basis: carrier invoice in EUR |
| Customs clearance | €285 flat fee | Per declaration |
| D&D pass-through | Cost + 5% | Requires client pre-approval above €2,000 |
| Documentation fee | €75 flat | Per B/L set |
| Inland transport | Cost + 10% | Confirmed quote before booking |

---

**Discrepancy handling:**
If the carrier invoice differs from the original quote by **>5%**, flag for client approval before issuing the sales invoice. Attach carrier invoice as evidence.

**Credit notes:**
Issue within 5 business days of dispute receipt. CC ops_manager and finance.

**D&D disputes:**
Demir Industrial has a standing SLA dispute clause — if terminal delay caused the charges, submit a Port Incident Report and pass the dispute to MSC before billing the client.

---

Want me to pre-fill the sales invoice for AL-2026-1041 with these rates?`;

/* ── Mock response selector ──────────────────────────────────────────────── */

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMockResponse(userMessage: string, pageContext: string): string {
  const msg = userMessage.toLowerCase();
  const ctx = pageContext.toLowerCase();

  // Dossier update email — must match before generic email check
  if (
    (msg.includes("dossier") || msg.includes("al-2026")) &&
    (msg.includes("email") || msg.includes("draft") || msg.includes("update") || msg.includes("write"))
  ) {
    return DOSSIER_EMAIL_RESPONSE;
  }

  // Billing SOP query
  if (
    msg.includes("sop") ||
    (msg.includes("billing") && (msg.includes("client") || msg.includes("sop") || msg.includes("rule") || msg.includes("procedure"))) ||
    msg.includes("billing sop") ||
    msg.includes("billing procedure")
  ) {
    return SOP_BILLING_RESPONSE;
  }

  // Email / drafting requests
  if (
    msg.includes("email") ||
    msg.includes("draft") ||
    msg.includes("write") ||
    msg.includes("letter") ||
    msg.includes("message") ||
    msg.includes("notify")
  ) {
    return pickFrom(EMAIL_RESPONSES);
  }

  // Demurrage & detention
  if (
    msg.includes("demurrage") ||
    msg.includes("free time") ||
    msg.includes("d&d") ||
    msg.includes("detention") ||
    msg.includes("terminal")
  ) {
    return pickFrom(DEMURRAGE_RESPONSES);
  }

  // Customs
  if (
    msg.includes("customs") ||
    msg.includes("hold") ||
    msg.includes("document") ||
    msg.includes("declaration") ||
    msg.includes("hs code") ||
    msg.includes("clearance") ||
    ctx.includes("customs")
  ) {
    return pickFrom(CUSTOMS_RESPONSES);
  }

  // Specific shipment context
  if (ctx.includes("shipment:") || msg.includes("shipment") || msg.includes("al-")) {
    return pickFrom(SHIPMENT_RESPONSES);
  }

  return pickFrom(GENERAL_RESPONSES);
}

/* ── Typing delay simulation ─────────────────────────────────────────────── */

/**
 * Simulate a realistic AI response latency.
 * Longer user messages → slightly longer "think time".
 */
async function simulateTypingDelay(userMessage: string): Promise<void> {
  const base = 700;
  const perChar = 12;
  const jitter = Math.random() * 500;
  const delay = Math.min(base + userMessage.length * perChar + jitter, 3200);
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
}

/* ── OpenAI live call ────────────────────────────────────────────────────── */

async function callOpenAI(
  userMessage: string,
  options: SendOptions,
  apiKey: string,
): Promise<string> {
  const systemMsg: ChatMessage = {
    role: "system",
    content: buildSystemPrompt(options.pageContext ?? "Dashboard"),
  };

  const history = (options.history ?? []).slice(-10); // keep last 10 for context window

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [systemMsg, ...history, { role: "user", content: userMessage }],
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";
}

/* ── Public API ──────────────────────────────────────────────────────────── */

const isDemoMode = !import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Returns true when running without an OpenAI key.
 * Use this to show a "Demo mode" badge in the UI.
 */
export function isAiDemoMode(): boolean {
  return isDemoMode;
}

/**
 * Send a chat message and receive an AI response.
 * Automatically switches between live OpenAI and demo mode.
 */
export async function sendChatMessage(
  userMessage: string,
  options: SendOptions = {},
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

  if (!apiKey) {
    // Demo mode: realistic mock with simulated delay.
    await simulateTypingDelay(userMessage);
    return getMockResponse(userMessage, options.pageContext ?? "");
  }

  return callOpenAI(userMessage, options, apiKey);
}
