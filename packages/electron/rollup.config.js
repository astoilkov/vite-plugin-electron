import fs from 'fs'
import path from 'path'
import { builtinModules } from 'module'
import { defineConfig } from 'rollup'
import typescript from '@rollup/plugin-typescript'
import pkg from './package.json'

const iscjs = process.argv.slice(2).includes('cjs')
const renderer = 'electron-renderer'

export default defineConfig({
  plugins: [
    {
      name: '@rollup/plugin-electron-renderer',
      resolveId(source) {
        const importee = 'vite-plugin-electron-renderer'
        const filename = path.join(__dirname, '..', source.replace(importee, renderer))
        if (source === importee) {
          return path.join(filename, 'es/index.js')
        } else if (source.startsWith(importee)) {
          const filename_ext = filename + '.js'
          return fs.existsSync(filename_ext) ? filename_ext : filename
        }
      },
    },
    typescript(),
  ],
  input: path.join(__dirname, 'src/index.ts'),
  output: {
    dir: __dirname,
    entryFileNames: `[name]${iscjs ? '.cjs' : '.mjs'}`,
  },
  external: [
    'vite',
    ...builtinModules
      .filter(m => !m.startsWith('_'))
      .map(m => [m, `node:${m}`])
      .flat(),
    ...Object.keys(pkg.dependencies),
  ],
})
