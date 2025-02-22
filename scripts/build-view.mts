import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
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

async function patchFile(file: string, regex: RegExp | string, replacement: (match: string) => string) {
  const input = await fs.readFile(file, 'utf-8')
  const output = input.replaceAll(regex, replacement)
  if (input === output)
    throw new Error(`Failed to patch ${file}`)
  await fs.writeFile(file, output, 'utf-8')
}

await patchFile(
  r('../json-discovery/src/discovery/index.js'),
  'discovery.nav.remove(\'index-page\');',
  match => `${match}\nreturn discovery;`,
)

await patchFile(
  r('../json-discovery/src/discovery/navbar.js'),
  `
    host.nav.prepend({
        when: '#.page != "whatsnew"',
        data: '"hasNews".callAction()',
        whenData: true,
        content: 'text:"What\\'s new"',
        onClick: () => {
            host.setPage('whatsnew');
        }
    });`.trimStart(),
  () => '',
)

await patchFile(
  r('../json-discovery/src/discovery/navbar.js'),
  `
    host.nav.menu.append({
        content: 'text:"What\\'s new"',
        onClick(_, { hide }) {
            hide();
            host.setPage('whatsnew');
        }
    });`.trimStart(),
  () => '',
)

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
