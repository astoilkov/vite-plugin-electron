/**
 * 🚨 has BUG!
 */
import path from 'path'
import { builtinModules } from 'module'
import { defineConfig } from 'vite'
import pkg from './package.json'

export default defineConfig({
  build: {
    minify: false,
    outDir: __dirname,
    emptyOutDir: false,
    lib: {
      entry: path.join(__dirname, 'src/index.ts'),
      formats: ['cjs', 'es'],
      fileName: format => format === 'cjs' ? '[name].cjs' : '[name].mjs',
    },
    rollupOptions: {
      external: [
        ...builtinModules
          .filter(m => !m.startsWith('_'))
          .map(m => [m, `node:${m}`])
          .flat(),
        ...Object.keys(pkg.dependencies).filter(p => p !== 'vite-plugin-electron-renderer'),
      ],
    },
  },
})
