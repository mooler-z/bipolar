import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [react(), tailwindcss()],
  server: {
    // A fixed port, and a failure rather than a silent hop. The deployment's
    // SITE_URL names this exact origin as the one allowed to complete a
    // sign-in, so a dev server that quietly moved to the next free port would
    // fail every sign-in with nothing on screen to say why.
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    // Flags stay files. Vite inlines any asset under 4KB as base64, and two
    // hundred small SVGs pasted into the main bundle is a megabyte the browser
    // downloads to show one of them. A file is fetched only when it is on screen.
    assetsInlineLimit: (file) => (file.includes("flag-icons") ? false : undefined),
  },
});
