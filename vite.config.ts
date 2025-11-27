
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Critical for Electron file:// protocol
  server: {
    port: 3000,
  },
  define: {
    // Safely shim process for browser compatibility
    'process': {
      env: {},
      platform: JSON.stringify((process as any).platform)
    }
  }
});
