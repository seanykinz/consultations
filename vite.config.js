import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],

  appType: "spa",

  base: "/",

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
})
