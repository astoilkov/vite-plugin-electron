import path from 'path'
import { createRequire } from 'module'
// import { app, BrowserWindow } from 'electron'
// import './samples'

const cjs_require = createRequire(import.meta.url)
const { app, BrowserWindow } = cjs_require('electron')

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

export const ROOT_PATH = {
  // /dist
  dist: path.join(__dirname, '../..'),
  // /dist or /public
  public: path.join(__dirname, app.isPackaged ? '../..' : '../../../public'),
}

let win: import('electron').BrowserWindow | null = null
// Here, you can also use other preload
const preload = path.join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL as string
const indexHtml = path.join(ROOT_PATH.dist, 'index.html')

function createWindow() {
  win = new BrowserWindow({
    webPreferences: {
      preload,
    },
  })

  if (app.isPackaged) {
    win.loadFile(indexHtml)
  } else {
    win.loadURL(url)
  }
}

app.whenReady().then(createWindow)
