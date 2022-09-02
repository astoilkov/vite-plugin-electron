import path from 'path'
import { spawn } from 'child_process'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import {
  type Plugin,
  type ViteDevServer,
  type UserConfig,
  type InlineConfig,
  build as viteBuild,
  mergeConfig,
} from 'vite'
import type { Configuration } from './types'
import {
  createWithExternal,
  resolveRuntime,
  resolveBuildConfig,
  checkPkgMain,
  resolveEnv,
} from './config'

// https://github.com/vitejs/vite/blob/86bf776b1fea26f292163f911fe59ed201d73baf/packages/vite/rollup.config.ts#L264-L273
const cjs = {
  __filename: fileURLToPath(import.meta.url),
  __dirname: path.dirname(fileURLToPath(import.meta.url)),
  require: createRequire(import.meta.url),
}

/**
 * Custom start plugin
 */
export function onstart(onstart?: () => void): Plugin {
  return {
    name: 'electron-custom-start',
    configResolved(config) {
      const index = config.plugins.findIndex(p => p.name === 'electron-main-watcher')
        // At present, Vite can only modify plugins in configResolved hook.
        ; (config.plugins as Plugin[]).splice(index, 1)
    },
    closeBundle() {
      onstart?.()
    },
  }
}

export async function bootstrap(config: Configuration, server: ViteDevServer) {
  const electronPath = cjs.require('electron')
  const { config: viteConfig } = server

  // ---- Electron-Preload ----
  if (config.preload) {
    const preloadRuntime = resolveRuntime('preload', config, viteConfig)
    const preloadConfig = mergeConfig(
      {
        build: {
          watch: {},
        },
        plugins: [{
          name: 'electron-preload-watcher',
          closeBundle() {
            server.ws.send({ type: 'full-reload' })
          },
        }],
      } as UserConfig,
      resolveBuildConfig(preloadRuntime),
    ) as InlineConfig

    await viteBuild(createWithExternal(preloadRuntime)(preloadConfig))
  }

  // ---- Electron-Main ----
  const env = resolveEnv(server)
  if (env) {
    Object.assign(process.env, {
      VITE_DEV_SERVER_URL: env.url,
      VITE_DEV_SERVER_HOSTNAME: env.hostname,
      VITE_DEV_SERVER_PORT: env.port,
    })
  }

  const mainRuntime = resolveRuntime('main', config, viteConfig)
  const mainConfig = mergeConfig(
    {
      build: {
        watch: {},
      },
      plugins: [
        {
          name: 'electron-main-watcher',
          closeBundle() {
            if (process.electronApp) {
              process.electronApp.removeAllListeners()
              process.electronApp.kill()
            }

            // Start Electron.app
            process.electronApp = spawn(electronPath, ['.', '--no-sandbox'], { stdio: 'inherit' })
            // Exit command after Electron.app exits
            process.electronApp.once('exit', process.exit)
          },
        },
        checkPkgMain.buildElectronMainPlugin(mainRuntime),
      ],
    } as UserConfig,
    resolveBuildConfig(mainRuntime),
  ) as InlineConfig

  await viteBuild(createWithExternal(mainRuntime)(mainConfig))
}
