import { resolve } from "node:path";
import { defineConfig } from "vite";

// Multi-page app: every real route is its own HTML entry point compiled by
// Vite. There is no client-side router — this keeps the "vanilla HTML/CSS"
// intent while still getting bundling, TypeScript, and fast HMR in dev.
export default defineConfig({
  // Relative base so built asset references (JS/CSS bundles Vite injects)
  // resolve correctly regardless of what path/subdirectory the site is
  // served from - matters for anything other than "deployed at domain root".
  base: "./",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "src/pages/login/index.html"),
        register: resolve(__dirname, "src/pages/register/index.html"),
        dashboard: resolve(__dirname, "src/pages/dashboard/index.html"),
        upload: resolve(__dirname, "src/pages/upload/index.html"),
        processing: resolve(__dirname, "src/pages/processing/index.html"),
        reports: resolve(__dirname, "src/pages/reports/index.html"),
        results: resolve(__dirname, "src/pages/results/index.html"),
        replay: resolve(__dirname, "src/pages/replay/index.html"),
        settings: resolve(__dirname, "src/pages/settings/index.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});
