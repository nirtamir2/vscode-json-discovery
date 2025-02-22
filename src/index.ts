import type { ExtensionContext, WebviewPanel } from 'vscode'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { commands, Uri, ViewColumn, window, workspace } from 'vscode'
import { commands as Commands } from './generated-meta'

const webviewDistPath = fileURLToPath(new URL('../res/webview', import.meta.url))

const _panelsRegistry = new Map<string, JsonDiscoveryPanel>()

class JsonDiscoveryPanel {
  panel: WebviewPanel | undefined
  uri: Uri

  static get(uri: Uri) {
    if (!_panelsRegistry.get(uri.fsPath))
      _panelsRegistry.set(uri.fsPath, new JsonDiscoveryPanel(uri))
    return _panelsRegistry.get(uri.fsPath)!
  }

  private constructor(uri: Uri) {
    this.uri = uri
  }

  ensurePanel() {
    if (this.panel)
      return this.panel

    const panel = this.panel = window.createWebviewPanel(
      'json-discovery.viewer',
      'JSON Discovery',
      ViewColumn.One, // Editor column to show the new webview panel in.
      {
        enableScripts: true,
        localResourceRoots: [Uri.file(webviewDistPath)],
      },
    )

    panel.webview.html = fs.readFileSync(path.join(webviewDistPath, 'index.html'), 'utf-8')

    panel.onDidDispose(() => {
      this.panel = undefined
    })

    return panel
  }

  async postData() {
    if (!this.panel)
      return

    const document = await workspace.openTextDocument(this.uri)
    this.panel.title = `JSON Discovery - ${document.fileName}`

    if (!this.panel.visible) {
      await new Promise((resolve) => {
        this.panel!.onDidChangeViewState((e) => {
          if (e.webviewPanel.visible)
            resolve(true)
        })
      })
    }

    this.panel.webview.postMessage({
      from: 'vscode-host',
      type: 'data',
      data: document.getText(),
    })
  }

  dispose() {
    this.panel?.dispose()
    _panelsRegistry.delete(this.uri.fsPath)
  }

  reveal() {
    this.ensurePanel().reveal()
  }
}

async function show() {
  const doc = window.activeTextEditor?.document
  const uri = doc?.uri
  if (!doc || !uri)
    return
  if (doc.languageId !== 'json')
    return
  const panel = JsonDiscoveryPanel.get(uri)
  panel?.reveal()
  await panel?.postData()
}

export function activate(_ext: ExtensionContext) {
  commands.registerCommand(Commands.show, () => show())
}

export function deactivate() {

}
