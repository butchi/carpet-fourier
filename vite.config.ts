import { defineConfig } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    global: "globalThis",
  },
  plugins: [
    nodePolyfills(), // this is necessary to avoid "process is not defined issue"
  ],
  base: "/carpet-fourier/",
})
