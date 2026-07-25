// ================================================================
// ModaGo – Tipuri TypeScript pentru sistemul Escrow
// Fișier: src/types/escrow.ts
// ================================================================

// ── ENUMS ────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled";

export type EscrowTxType =
  | "hold"
  | "release"
  | "refund"
  | "partial_refund"
  | "fee_collected";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_release"
  | "resolved_refund"
  | "resolved_split"
  | "closed";

export type EvidenceType = "image" | "text_note";

// ── SHIPPING ADDRESS ─────────────────────────────────────────────

export interface ShippingAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  city: string;
  address: string;
  postal_code?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Snapshot stocat în orders.shipping_address (JSONB)
export interface ShippingAddressSnapshot {
  full_name: string;
  phone: string;
  city: string;
  address: string;
  postal_code?: string;
}

// ── ORDER ────────────────────────────────────────────────────────

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  item_id: number;
  status: OrderStatus;

  // Financiar
  price_mdl: number;
  fee_pct: number;
  fee_mdl: number;
  net_mdl: number;

  // Stripe
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  stripe_transfer_id?: string;
  stripe_refund_id?: string;

  // Livrare
  shipping_address?: ShippingAddressSnapshot;
  courier_name?: string;
  tracking_number?: string;

  // Timestamps
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  auto_release_at?: string;
  scheduled_delete_at?: string;

  // Flags
  has_open_ticket: boolean;

  created_at: string;
  updated_at: string;
}

// Order cu date join-uite (pentru UI)
export interface OrderWithDetails extends Order {
  item?: {
    id: number;
    title: string;
    price: number;
    images: string[];
  };
  buyer?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  seller?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  dispute?: Dispute;
  review?: SellerReview;
}

// ── ESCROW TRANSACTION ───────────────────────────────────────────

export interface EscrowTransaction {
  id: string;
  order_id: string;
  type: EscrowTxType;
  amount_mdl: number;
  stripe_id?: string;
  notes?: string;
  created_at: string;
}

// ── DISPUTE ──────────────────────────────────────────────────────

export type OfferStatus = "none" | "pending" | "accepted" | "rejected";

export interface Dispute {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: DisputeStatus;
  admin_note?: string;
  resolved_by?: string;
  resolved_at?: string;
  split_refund_pct?: number;
  buyer_offer_pct?: number | null;
  offer_status: OfferStatus;
  return_stage: ReturnStage;
  return_tracking_number?: string | null;
  return_shipping_cost_mdl?: number | null;
  return_shipped_at?: string | null;
  return_received_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReturnStage = "none" | "awaiting_return" | "shipped" | "received";

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  uploaded_by: string;
  type: EvidenceType;
  storage_path?: string;
  description?: string;
  created_at: string;
}

// ── SELLER REVIEW ────────────────────────────────────────────────

export interface SellerReview {
  id: string;
  order_id: string;
  reviewer_id: string;
  seller_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  created_at: string;
}

export interface SellerRatingSummary {
  seller_id: string;
  total_reviews: number;
  avg_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  low_star: number;
}

// ── PAYLOAD-URI PENTRU SERVICII ──────────────────────────────────

export interface CreateOrderPayload {
  item_id: string;
  shipping_address_id: string;
}

export interface AddTrackingPayload {
  order_id: string;
  courier_name: string;
  tracking_number: string;
}

export interface OpenDisputePayload {
  order_id: string;
  reason: string;
}

export interface CreateReviewPayload {
  order_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

// ── HELPERS ──────────────────────────────────────────────────────

/** Status-uri în care cumpărătorul poate acționa */
export const BUYER_ACTIONABLE_STATUSES: OrderStatus[] = ["shipped", "disputed"];

/** Status-uri în care vânzătorul poate acționa */
export const SELLER_ACTIONABLE_STATUSES: OrderStatus[] = ["paid"];

/** Status-uri finale (nu mai necesită acțiuni) */
export const TERMINAL_STATUSES: OrderStatus[] = [
  "completed",
  "refunded",
  "cancelled",
];

/** Labeluri în română pentru fiecare status */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Așteaptă plata",
  paid: "Plătit – pregătit de expediere",
  shipped: "Expediat",
  delivered: "Livrat – confirmare în curs",
  completed: "Finalizat",
  disputed: "Dispută deschisă",
  refunded: "Rambursat",
  cancelled: "Anulat",
};

/** Culori pentru badge-uri status (cheile Tailwind/design system) */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "amber",
  paid: "blue",
  shipped: "purple",
  delivered: "teal",
  completed: "green",
  disputed: "red",
  refunded: "gray",
  cancelled: "gray",
};

/** Labeluri în română pentru fiecare status de dispută */
export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Deschisă — în așteptare",
  under_review: "În analiză",
  resolved_release: "Rezolvată — fonduri eliberate vânzătorului",
  resolved_refund: "Rezolvată — cumpărător rambursat",
  resolved_split: "Rezolvată — sumă împărțită",
  closed: "Închisă",
};

/** Calculează valoarea escrow-ului (fee 0% implicit la launch) */
export function calculateOrderAmounts(
  price_mdl: number,
  fee_pct: number = 0,
): { fee_mdl: number; net_mdl: number } {
  const fee_mdl = Math.round(price_mdl * fee_pct) / 100;
  const net_mdl = Math.round((price_mdl - fee_mdl) * 100) / 100;
  return { fee_mdl, net_mdl };
}
