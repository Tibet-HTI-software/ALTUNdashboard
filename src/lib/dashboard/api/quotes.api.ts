import { createApiError, simulateRead, simulateSuccess } from "./client";
import { quotes } from "@/data/dashboard/quotes";
import type {
  ContainerGauge,
  ContainerKind,
  Incoterm,
  Priority,
  Quote,
  QuoteDirection,
  QuoteStatus,
} from "@/lib/dashboard/types";
import type { CreateQuoteInput } from "./types";
import { supabase, withSupabaseFallback } from "./supabase";

interface QuoteRow {
  reference: string;
  customer_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  direction: QuoteDirection;
  container: ContainerKind;
  gauge: ContainerGauge | null;
  goods_description: string;
  hs_code: string | null;
  gross_weight_kg: number;
  net_weight_kg: number;
  port_of_loading: string;
  port_of_destination: string;
  incoterm: Incoterm;
  insurance: boolean;
  vgm_required: boolean;
  loading_address: string;
  loading_postal_code: string;
  loading_city: string;
  loading_country: string;
  delivery_address: string;
  delivery_postal_code: string;
  delivery_city: string;
  delivery_country: string;
  urgency: Priority;
  status: QuoteStatus;
  requested_at: string;
  notes: string | null;
}

const COLUMNS = `
  reference, customer_name, contact_name, contact_email, contact_phone,
  direction, container, gauge, goods_description, hs_code,
  gross_weight_kg, net_weight_kg, port_of_loading, port_of_destination, incoterm,
  insurance, vgm_required,
  loading_address, loading_postal_code, loading_city, loading_country,
  delivery_address, delivery_postal_code, delivery_city, delivery_country,
  urgency, status, requested_at, notes
`;

function rowToQuote(row: QuoteRow): Quote {
  return {
    id: row.reference,
    customer: row.customer_name,
    contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    direction: row.direction,
    container: row.container,
    gauge: row.gauge ?? undefined,
    goodsDescription: row.goods_description,
    hsCode: row.hs_code ?? undefined,
    grossWeightKg: row.gross_weight_kg,
    netWeightKg: row.net_weight_kg,
    portOfLoading: row.port_of_loading,
    portOfDestination: row.port_of_destination,
    incoterm: row.incoterm,
    insurance: row.insurance,
    vgmRequired: row.vgm_required,
    loading: {
      address: row.loading_address,
      postalCode: row.loading_postal_code,
      city: row.loading_city,
      country: row.loading_country,
    },
    delivery: {
      address: row.delivery_address,
      postalCode: row.delivery_postal_code,
      city: row.delivery_city,
      country: row.delivery_country,
    },
    urgency: row.urgency,
    status: row.status,
    requestedAt: row.requested_at,
    assignedTo: "Sales",
    notes: row.notes ?? undefined,
    // Legacy compatibility fields used by older components.
    origin: row.port_of_loading,
    destination: row.port_of_destination,
    service: row.direction === "Export" ? "Sea Freight FCL" : "Sea Freight LCL",
    cargo: row.goods_description,
  };
}

export async function getQuotes(): Promise<Quote[]> {
  return withSupabaseFallback(
    "quotes",
    async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(COLUMNS)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return (data as QuoteRow[]).map(rowToQuote);
    },
    () => simulateRead(() => quotes),
  );
}

export async function getQuoteById(id: string): Promise<Quote> {
  return withSupabaseFallback(
    "quotes",
    async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select(COLUMNS)
        .eq("reference", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw createApiError(`Quote ${id} not found.`, "not_found");
      return rowToQuote(data as QuoteRow);
    },
    () =>
      simulateRead(() => {
        const found = quotes.find((q) => q.id === id);
        if (!found) {
          throw createApiError(`Quote ${id} not found.`, "not_found");
        }
        return found;
      }),
  );
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<Quote> {
  // Mock-only persistence for now. Real Supabase update would go here once
  // RLS permits authenticated writes. Until then we return a synthesized
  // Quote so the UI can refresh.
  return withSupabaseFallback(
    "quotes",
    async () => {
      const { data, error } = await supabase
        .from("quotes")
        .update({ status })
        .eq("reference", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw createApiError(`Quote ${id} not found.`, "not_found");
      return rowToQuote(data as QuoteRow);
    },
    () => {
      const found = quotes.find((q) => q.id === id);
      if (!found) {
        throw createApiError(`Quote ${id} not found.`, "not_found");
      }
      return simulateSuccess({ ...found, status });
    },
  );
}

export async function createQuote(input: CreateQuoteInput): Promise<Quote> {
  const id = `Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const draft: Quote = {
    id,
    customer: input.customer,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    direction: input.direction,
    container: input.container,
    gauge: input.gauge,
    goodsDescription: input.goodsDescription,
    hsCode: input.hsCode,
    grossWeightKg: input.grossWeightKg,
    netWeightKg: input.netWeightKg,
    portOfLoading: input.portOfLoading,
    portOfDestination: input.portOfDestination,
    incoterm: input.incoterm,
    insurance: input.insurance,
    vgmRequired: input.vgmRequired,
    loading: input.loading,
    delivery: input.delivery,
    urgency: input.urgency,
    status: "New",
    requestedAt: new Date().toISOString().slice(0, 10),
    assignedTo: "Sales",
    notes: input.notes,
    origin: input.portOfLoading,
    destination: input.portOfDestination,
    service:
      input.direction === "Export" ? "Sea Freight FCL" : "Sea Freight LCL",
    cargo: input.goodsDescription,
  };
  return simulateSuccess(draft);
}
