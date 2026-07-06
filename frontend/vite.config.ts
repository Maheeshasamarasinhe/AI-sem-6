import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://localhost:8000",
      "/skills": "http://localhost:8000",
      "/problem_types": "http://localhost:8000",
      "/predict": "http://localhost:8000",
      "/explain": "http://localhost:8000",
    },
  },
});
