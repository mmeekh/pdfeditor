import { resolve } from 'path';

export default {
  build: {
    outDir: 'site/dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'site/js/main.js'),
        themeManager: resolve(__dirname, 'site/js/theme-manager.js'),
        gtm: resolve(__dirname, 'site/js/gtm.js'),
        gtagConfig: resolve(__dirname, 'site/js/gtag-config.js'),
        tailwindConfig: resolve(__dirname, 'site/js/tailwind-config.js'),
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'js/[name][extname]'
      }
    }
  }
};
