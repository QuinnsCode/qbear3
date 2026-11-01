// src/client.tsx
import { initClient, initClientNavigation } from "rwsdk/client";

// Client navigation: a click on an internal link fetches only the next page's RSC payload and swaps it in,
// instead of reloading the document, styles and scripts. Links that start with http, open a new tab,
// carry a # or a download attribute still navigate normally. A redirect or error reply (the auth hops to
// an org subdomain, say) is not ok, so handleResponse falls back to a full page load of that URL.
const { handleResponse, onHydrated } = initClientNavigation();

initClient({ handleResponse, onHydrated });
