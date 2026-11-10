import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { createSeed } from "./src/mocks/seed";
import { buildFeed } from "./src/mocks/feed";

/**
 * Publishes /feed.json (open jobs + counts) for the landing site.
 * Dev: served live. Build: written into dist. CORS is open so the landing site can read it.
 */
function landingFeed(): Plugin {
  const json = () => JSON.stringify(buildFeed(createSeed()));
  return {
    name: "landing-feed",
    configureServer(server) {
      server.middlewares.use("/feed.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(json());
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "feed.json", source: json() });
    },
  };
}

export default defineConfig({
  plugins: [react(), landingFeed()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: { port: 5174 },
  build: { target: "es2022" },
});
