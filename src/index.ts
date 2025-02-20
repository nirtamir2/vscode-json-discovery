import type { ExtensionContext, WebviewPanel } from 'vscode'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { commands, Uri, ViewColumn, window, workspace } from 'vscode'
import { commands as Commands } from './generated-meta'

const webviewDistPath = fileURLToPath(new URL('../res/webview', import.meta.url))

const _panelsRegistry = new Map<string, JsonDiscoveryPanel>()

class JsonDiscoveryPanel {
  panel: WebviewPanel
  uri: Uri

  static get(uri: Uri) {
    if (!_panelsRegistry.get(uri.fsPath))
      _panelsRegistry.set(uri.fsPath, new JsonDiscoveryPanel(uri))
    return _panelsRegistry.get(uri.fsPath)!
  }

  private constructor(uri: Uri) {
    this.uri = uri
    this.panel = window.createWebviewPanel(
      'json-discovery.viewer',
      'JSON Discovery',
      ViewColumn.One, // Editor column to show the new webview panel in.
      {
        enableScripts: true,
        localResourceRoots: [Uri.file(webviewDistPath)],
      },
    )

     workspace.openTextDocument(uri)
    .then(document=> {
      this.panel.webview.html = fs.readFileSync(path.join(webviewDistPath, 'sandbox.html'), 'utf-8') + 
      `
<script>
discoveryLoader.start(${JSON.stringify({
  type: 'file',
  name: document.uri.fsPath,
  createdAt: Date.now(),
})})
discoveryLoader.push(${JSON.stringify(document.getText())})
discoveryLoader.finish()
</script>
      `
    })
    
  }

  dispose() {
    this.panel.dispose()
    _panelsRegistry.delete(this.uri.fsPath)
  }

  reveal() {
    this.panel.reveal()
  }
}

function show() {
  const doc = window.activeTextEditor?.document
  const uri = doc?.uri
  if (!doc || !uri)
    return
  if (doc.languageId !== 'json')
    return
  const panel = JsonDiscoveryPanel.get(uri)
  panel?.reveal()
}

export function activate(_ext: ExtensionContext) {
  commands.registerCommand(Commands.show, () => show())
}

export function deactivate() {

}
