import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com'],
    host: true
  }
});
