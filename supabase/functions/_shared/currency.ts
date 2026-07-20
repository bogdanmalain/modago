// supabase/functions/_shared/currency.ts
// Stripe nu suportă MDL (leul moldovenesc) ca monedă de plată.
// Taxăm cardurile în RON (leul românesc, suportat de Stripe) și convertim
// intern din price_mdl/net_mdl folosind acest curs. Actualizează periodic.

export const MDL_TO_RON = 0.26;
export const STRIPE_CHARGE_CURRENCY = "ron";

export function mdlToRonCents(amountMdl: number): number {
  return Math.round(amountMdl * MDL_TO_RON * 100);
}
