import { defineConfig } from "vite";
import { redwood } from "rwsdk/vite";
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  optimizeDeps: {
    exclude: ['rwsdk/use-synced-state/worker'],
  },
  environments: {
    // rwsdk turns on source maps everywhere. In the browser build, write them (dist/client, kept out of the
    // deployed assets by public/.assetsignore) without the sourceMappingURL comment, so no page asks for them.
    client: {
      build: { sourcemap: 'hidden' },
    },
    ssr: {
      optimizeDeps: {
        exclude: ['rwsdk/use-synced-state/worker'],
      }
    },
    worker: {
      optimizeDeps: {
        exclude: ['rwsdk/use-synced-state/worker'],
      }
    },
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
    redwood(),
    tailwindcss()
  ],
});