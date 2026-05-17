/**
 * Shared option lists for the quote-request flow.
 *
 * Used by both the public quote form (src/routes/index.tsx) and the
 * internal Quotes dashboard, so that the catalogue stays in sync.
 * When the real backend lands, these lists should come from a config
 * service or master-data table — but the field shape stays the same.
 */
import type { ContainerKind, Incoterm, QuoteDirection } from "./types";

export const QUOTE_DIRECTIONS: QuoteDirection[] = ["Import", "Export"];

export interface ContainerGroup {
  label: string;
  options: ContainerKind[];
}

export const CONTAINER_GROUPS: ContainerGroup[] = [
  {
    label: "Standard",
    options: [
      "20ft Standard (DV)",
      "40ft Standard (DV)",
      "40ft High Cube (HC)",
      "45ft High Cube",
    ],
  },
  {
    label: "Cooled",
    options: ["20ft Reefer", "40ft Reefer HC"],
  },
  {
    label: "Special",
    options: [
      "Open Top 20ft",
      "Open Top 40ft",
      "Flat Rack 20ft",
      "Flat Rack 40ft",
      "Hard Top",
      "Platform",
    ],
  },
];

export const INCOTERMS: { value: Incoterm; label: string }[] = [
  { value: "EXW", label: "EXW — Ex Works" },
  { value: "FCA", label: "FCA — Free Carrier" },
  { value: "FOB", label: "FOB — Free On Board" },
  { value: "CFR", label: "CFR — Cost and Freight" },
  { value: "CIF", label: "CIF — Cost, Insurance and Freight" },
  { value: "DAP", label: "DAP — Delivered At Place" },
  { value: "DDP", label: "DDP — Delivered Duty Paid" },
];
