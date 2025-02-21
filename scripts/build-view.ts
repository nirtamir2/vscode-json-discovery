import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { x } from 'tinyexec'
import { build } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

await x('git', ['checkout', '.'], {
  nodeOptions: {
    cwd: r('../json-discovery'),
  },
})

const patchContent = await fs.readFile(r('../json-discovery/src/discovery/index.js'), 'utf-8')
const patched = patchContent.replace('discovery.nav.remove(\'index-page\');', 'discovery.nav.remove(\'index-page\');return discovery;')
if (patchContent === patched)
  throw new Error('Failed to patch json-discovery')
await fs.writeFile(r('../json-discovery/src/discovery/index.js'), patched, 'utf-8')

await x('npm', ['run', 'build'], {
  nodeOptions: {
    cwd: r('../json-discovery'),
  },
})

await fs.rm(r('../res/webview'), { recursive: true, force: true })

const styleInjectionRe = /\{\s*type:\s*["']link["'],\s*href:\s*["']discovery\.css["']\s*\}/
const discoveryCSS = await fs.readFile(r('../json-discovery/build-chrome/discovery.css'), 'utf-8')
const cssDataUrl = `data:text/css;base64,${Buffer.from(discoveryCSS).toString('base64')}`

await build({
  root: r('../scripts'),
  plugins: [
    {
      name: 'inline-style-injection',
      transform(code) {
        if (styleInjectionRe.test(code))
          return code.replace(styleInjectionRe, `{ type: "link", href: ${JSON.stringify(cssDataUrl)} }`)
      },
    },
    viteSingleFile(),
  ],
  build: {
    minify: false,
    cssMinify: true,
    emptyOutDir: true,
    outDir: r('../res/webview'),
    rollupOptions: {
      input: r('./index.html'),
    },
  },
})

await x('git', ['checkout', '.'], {
  nodeOptions: {
    cwd: r('../json-discovery'),
  },
})
