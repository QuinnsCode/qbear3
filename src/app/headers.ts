import { RouteMiddleware } from "rwsdk/router";
import { IS_DEV } from "rwsdk/constants";

export const setCommonHeaders =
  (): RouteMiddleware =>
  ({ response, rw: { nonce } }) => {
    if (!IS_DEV) {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload",
      );
    }

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    );

    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://cards.scryfall.io https://c1.scryfall.com; connect-src 'self' https://api.scryfall.com; frame-src https://challenges.cloudflare.com; object-src 'none';`,
    );
  };