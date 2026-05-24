import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this; wrangler.jsonc main alone is insufficient.
export default defineConfig(({ command }) => ({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    command === "build" ? cloudflare() : undefined,
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
    dedupe: ["react", "react-dom", "@tanstack/react-start", "@tanstack/react-router"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(command === "build" ? "production" : "development"),
    "process.env.TSS_ROUTER_BASEPATH": JSON.stringify(process.env.TSS_ROUTER_BASEPATH ?? ""),
  },
  envPrefix: "VITE_",
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-router"],
  },
  build: {
    target: "es2022",
  },
  ssr: {
    noExternal: ["@tanstack/react-start", "@tanstack/react-router"],
  },
}));
