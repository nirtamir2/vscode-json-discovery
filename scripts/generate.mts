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

const styleInjectionRe = /{\s*type:\s*["']link["'],\s*href:\s*["']discovery.css["']\s*}/

await build({
  root: fileURLToPath(new URL('..', import.meta.url)),
  
  plugins: [
    // {
    //   name: 'remove-style-injection',
    //   // transform(code) {
    //   //   if (styleInjectionRe.test(code)) 
    //   //     return code.replace(styleInjectionRe, '')
    //   // } 
    // },
    viteSingleFile(),
  ],
  build: {
    minify: false,
    cssMinify: true,
    emptyOutDir: true,
    outDir: fileURLToPath(new URL('../res/webview', import.meta.url)),
    rollupOptions: {
      input: fileURLToPath(new URL('./sandbox.html', import.meta.url)),
    }
  }
})

await fs.copyFile(
  fileURLToPath(new URL('../json-discovery/build-chrome/discovery.css', import.meta.url)),
  fileURLToPath(new URL('../res/webview/scripts/discovery.css', import.meta.url)),
)
