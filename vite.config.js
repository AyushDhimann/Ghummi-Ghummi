// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Make sure this is correct for your development environment if needed
    // allowedHosts: ['scope-tent-tips-freebsd.trycloudflare.com'],
    host: true // Allows access from network devices (useful for testing on mobile)
  },
  // Optional: Optimize dependencies if needed, Vite usually handles this well
  // optimizeDeps: {
  //   include: ['three', 'cannon-es', 'cannon-es-debugger', 'simplex-noise'],
  // },
});
