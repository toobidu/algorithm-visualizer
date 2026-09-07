import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  /**
   * `prettier-plugin-java` va `web-tree-sitter` nap wasm bang `new URL('./x.wasm', import.meta.url)`.
   * Qua buoc gom san bang esbuild thi URL do tro lech duong dan, may chu dev tra ve index.html,
   * va trinh duyet bao "expected magic word 00 61 73 6d, found 3c 21 64 6f" — chinh la `<!do`.
   * De nguyen hai goi nay o dang ESM thi URL tro dung file wasm trong node_modules.
   */
  optimizeDeps: {
    exclude: ['prettier-plugin-java', 'web-tree-sitter'],
  },
  server: {
    // Chuyen tiep sang gateway de trinh duyet khong phai lo CORS luc phat trien
    proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        // Monaco tai luoi thanh chunk rieng — ngan sach PLAN.md §4.1
        manualChunks: (id) => (id.includes('monaco-editor') ? 'monaco' : undefined),
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
