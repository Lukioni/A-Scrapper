import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
  },
  define: {
    // You can override the API base via VITE_API_BASE in a .env file
  }
});