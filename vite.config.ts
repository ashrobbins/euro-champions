import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Plain config object (not wrapped in defineConfig) to sidestep a Plugin-type
// mismatch between vite and vitest's vendored vite in this toolchain.
export default {
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
}
