import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const api = new URL(env.VITE_API_URL ?? "http://localhost:4000/api/v1");

  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: {
      port: 5174,
      // The landing site reads open jobs from /feed.json; the backend builds it from live jobs.
      proxy: { "/feed.json": { target: api.origin, changeOrigin: true, rewrite: () => `${api.pathname}/public/feed` } },
    },
    build: { target: "es2022" },
  };
});
