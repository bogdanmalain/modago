// src/services/errorTracking.js
//
// Raportare de erori din productie (Sentry).
//
// Doua reguli importante:
//  1. Expo Go nu poate incarca modulul nativ Sentry, deci il incarcam lazy,
//     exact ca in socialAuthService.js. In Expo Go raportarea e pur si simplu
//     inactiva, aplicatia merge normal.
//  2. Daca SENTRY_DSN lipseste din .env, nu initializam nimic. Aplicatia
//     functioneaza identic, doar ca erorile nu ajung nicaieri.
//
// Configurare: pune SENTRY_DSN=... in .env (vezi README-ul din comentariul de
// la finalul fisierului).

import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";

let SentryModule = null;

if (!isExpoGo) {
  try {
    SentryModule = require("@sentry/react-native");
  } catch {
    SentryModule = null;
  }
}

const DSN = Constants.expoConfig?.extra?.sentryDsn || "";
const APP_VERSION = Constants.expoConfig?.version || "unknown";

let initialized = false;

/** True doar cand chiar trimitem erori (build nativ + DSN configurat). */
export function isErrorTrackingActive() {
  return initialized;
}

/**
 * Sterge datele personale dintr-un eveniment inainte sa plece spre Sentry.
 * Politica noastra de confidentialitate promite ca nu trimitem date de plata
 * sau adrese — asta e locul unde respectam promisiunea.
 */
function scrubEvent(event) {
  if (event?.request?.cookies) delete event.request.cookies;
  if (event?.request?.headers) delete event.request.headers;

  // Pastram doar id-ul utilizatorului, nu email/IP.
  if (event?.user) {
    event.user = { id: event.user.id };
  }

  return event;
}

export function initErrorTracking() {
  if (initialized) return;
  if (!SentryModule || !DSN) return;

  try {
    SentryModule.init({
      dsn: DSN,
      release: APP_VERSION,

      // Nu trimite IP-ul si datele implicite despre utilizator.
      sendDefaultPii: false,

      // Esantionare: 100% din erori, 20% din tranzactiile de performanta.
      // Suficient pentru volumul de la lansare si ramane in planul gratuit.
      tracesSampleRate: 0.2,

      beforeSend: scrubEvent,
    });

    initialized = true;
  } catch {
    initialized = false;
  }
}

/** Leaga erorile de un utilizator, ca sa vezi pe cine afecteaza un bug. */
export function setErrorTrackingUser(userId) {
  if (!initialized || !SentryModule) return;
  try {
    SentryModule.setUser(userId ? { id: userId } : null);
  } catch {
    // ignoram — raportarea nu are voie sa strice fluxul aplicatiei
  }
}

/** Raporteaza manual o eroare prinsa intr-un try/catch. */
export function reportError(error, context) {
  if (!initialized || !SentryModule) return;
  try {
    SentryModule.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // idem
  }
}

/** Lasa o urma in istoricul evenimentelor dinaintea unei erori. */
export function addBreadcrumb(message, data) {
  if (!initialized || !SentryModule) return;
  try {
    SentryModule.addBreadcrumb({ message, data, level: "info" });
  } catch {
    // idem
  }
}

/**
 * Invelis peste componenta radacina, ca Sentry sa prinda si erorile de
 * randare React. Daca raportarea e inactiva, returneaza componenta neatinsa.
 */
export function wrapRootComponent(Component) {
  if (!SentryModule || !DSN) return Component;
  try {
    return SentryModule.wrap(Component);
  } catch {
    return Component;
  }
}
