import { defineConfig } from "vite";
import { redwood } from "rwsdk/vite";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  environments: {
    ssr: {},
  },
  plugins: [redwood(), tailwindcss()],
  build: {
    rollupOptions: {
      external: ['react-dom/client', 'react-dom/server']
    }
  }
});