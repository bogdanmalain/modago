// src/utils/stripeCompat.js
// @stripe/stripe-react-native accesează TurboModuleRegistry la nivel de modul,
// deci un `import` static crapă instant în Expo Go (fără dev build).
// Folosim require() condiționat, gardat de IS_EXPO_GO, ca modulul nativ
// să nu fie deloc evaluat când rulăm în Expo Go.
import React from "react";
import { USE_STRIPE_MOCK } from "./env";

const RealStripe = USE_STRIPE_MOCK
  ? null
  : require("@stripe/stripe-react-native");

export const StripeProvider = USE_STRIPE_MOCK
  ? ({ children }) => React.createElement(React.Fragment, null, children)
  : RealStripe.StripeProvider;

const MOCK_PAYMENT_SHEET = {
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ error: null }),
};

// Notă: USE_STRIPE_MOCK e constant pe durata rulării aplicației, deci ramura
// aleasă aici nu variază între randări — respectă Rules of Hooks în practică.
export function useCheckoutStripe() {
  if (USE_STRIPE_MOCK) {
    return MOCK_PAYMENT_SHEET;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return RealStripe.useStripe();
}
