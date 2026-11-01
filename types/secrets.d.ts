// Secrets and optional vars the Worker reads that `wrangler types` can't see: they come from `.dev.vars` or
// `wrangler secret`, not wrangler.jsonc. Optional, because a deploy may leave any of them unset.
declare namespace Cloudflare {
  interface Env {
    API_ENCRYPTION_KEY?: string;
    ASANA_PROJECT_GID?: string;
    DISCORD_BOT_TOKEN?: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    DISCORD_GAME_CHANNEL_ID?: string;
    DISCORD_GUILD_ID?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    LEMON_SQUEEZY_PRO_VARIANT_ID?: string;
    LEMON_SQUEEZY_STARTER_VARIANT_ID?: string;
    LEMON_SQUEEZY_WEBHOOK_SECRET?: string;
    NODE_ENV?: string;
    RESEND_API_KEY?: string;
    STRIPE_PRO_PRICE_ID?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_STARTER_PRICE_ID?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    TURNSTILE_SECRET_KEY?: string;
  }
}
