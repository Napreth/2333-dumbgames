import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'

const web = new URL('../dist/web/', import.meta.url)
const toy = new URL('../dist/toy/', import.meta.url)
const toyPrefix = '/toy/2333/'
const mime = new Map([
  ['html', 'text/html; charset=utf-8'],
  ['js', 'text/javascript; charset=utf-8'],
  ['css', 'text/css; charset=utf-8'],
  ['svg', 'image/svg+xml'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
])

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  const hostedToy = url.pathname.startsWith(toyPrefix)
  const root = hostedToy ? toy : web
  let path = url.pathname.slice(hostedToy ? toyPrefix.length : 1)
  try {
    if (!hostedToy && /^games\/[\w-]+$/.test(path)) {
      await readFile(new URL(path + '/index.html', root))
      response.writeHead(307, { Location: url.pathname + '/' + url.search }).end()
      return
    }
    if (!path || path.endsWith('/')) path += 'index.html'
    if (!/^(?:index\.html|games\/[\w-]+\/index\.html|assets\/[\w.-]+)$/.test(path)) throw new Error('Missing')
    const data = await readFile(new URL(path, root))
    response.writeHead(200, { 'Content-Type': mime.get(path.split('.').at(-1)) ?? 'application/octet-stream' }).end(data)
  } catch {
    const body = await readFile(new URL('404.html', web))
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(body)
  }
}).listen(4173, '127.0.0.1')
