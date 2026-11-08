import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build, createServer, normalizePath } from 'vite'

const registry = await createServer({
  configFile: false, logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null, ws: false },
})
let games, siteTitle
try {
  ;({ games } = await registry.ssrLoadModule('/src/core/game/registry.ts'))
  ;({ siteTitle } = await registry.ssrLoadModule('/src/app/site.ts'))
} finally {
  await registry.close()
}

const template = (await readFile('index.html', 'utf8'))
  .replace('./src/main.ts', '/src/main-web.ts')
  .replace('./src/assets/brand.svg', '/src/assets/brand.svg')
const pages = new Map()
const escape = (text) => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char])

function add(path, title, id) {
  const html = template.replace(/<title>.*<\/title>/, () => `<title>${escape(title)}</title>`)
  pages.set(normalizePath(resolve(path)), id === undefined ? html
    : html.replace('id="app"', () => `id="app" data-game="${escape(id)}"`))
}
add('index.html', siteTitle())
add('404.html', siteTitle('页面不存在'), '')
for (const { id, name } of games) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid static game ID: ${id}`)
  add(`games/${id}/index.html`, siteTitle(name), id)
}

await build({
  mode: 'web',
  build: { rollupOptions: { input: [...pages.keys()] } },
  plugins: [{
    name: 'game-html-entries',
    enforce: 'pre',
    resolveId(id) {
      const path = normalizePath(id)
      if (pages.has(path)) return path
    },
    load(id) { return pages.get(id) },
  }],
})
