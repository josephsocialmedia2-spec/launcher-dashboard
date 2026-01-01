import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Works well for GitHub Pages when deployed under a repo subpath.
// If you deploy at the root domain, you can remove/adjust `base`.
export default defineConfig({
  plugins: [react()],
  base: "./"
});
