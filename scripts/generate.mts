import fs from 'node:fs/promises'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { x } from 'tinyexec'
import { build } from 'vite'
import {viteSingleFile} from 'vite-plugin-singlefile'

await x('npm', ['run', 'build'], {
  nodeOptions: {
    cwd: fileURLToPath(new URL('../json-discovery', import.meta.url)),
  },
})

await fs.rm(fileURLToPath(new URL('../res/webview', import.meta.url)), { recursive: true, force: true })

await fs.copyFile(
  new URL('../json-discovery/build-chrome/sandbox-app.html', import.meta.url),
  new URL('../json-discovery/build-chrome/index.html', import.meta.url),
)

await build({
  root: fileURLToPath(new URL('../json-discovery/build-chrome', import.meta.url)),
  
  plugins: [
    viteSingleFile(),
    {
      name: 'index-html',
      enforce: 'pre',
      transformIndexHtml(code) {
        return [
          { tag: 'link', injectTo: 'head', attrs: { rel: 'stylesheet', href: 'discovery.css' } },
          { tag: 'script', injectTo: 'head', children: 'if (!window.parent) window.parent = window;' },
        ]
      }
    }
  ],
  build: {
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('../res/webview', import.meta.url)),
  }
})

await fs.rename(
  fileURLToPath(new URL('../res/webview/index.html', import.meta.url)),
  fileURLToPath(new URL('../res/webview/sandbox.html', import.meta.url))
)

fs.writeFile(
  new URL('../json-discovery/build-chrome/index.html', import.meta.url),
  `
<head>
  <script>globalThis.chrome = { storage: { sync: { get: (x) => Promise.resolve(x) } } }</script>
</head>
<body>
<pre>{ "name": "hello" }</pre>
<script type="module" src="content-script.js"></script>
</body>
`
)


await build({
  root: fileURLToPath(new URL('../json-discovery/build-chrome', import.meta.url)),
  plugins: [
    viteSingleFile(),
  ],
  build: {
    emptyOutDir: false,
    outDir: fileURLToPath(new URL('../res/webview', import.meta.url)),
  }
})

// await fs.cp(
//   fileURLToPath(new URL('../json-discovery/build-chrome', import.meta.url)),
//   fileURLToPath(new URL('../res/webview', import.meta.url)),
//   {
//     recursive: true,
//     force: true,
//     filter(source) {
//       if (source.endsWith('.zip'))
//         return false
//       const name = basename(source)
//       const ignores = ['manifest.json', 'content-script.js', 'background.js']
//       return !ignores.includes(name)
//     },
//   },
// )
