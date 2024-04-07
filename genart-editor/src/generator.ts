import * as genart from '@lyr_7d1h/genart'
import * as monaco from 'monaco-editor'
import { Editor } from './editor'
import { Options } from './options'
import { error, warn } from './error'
import { type ID, IDFromString, IDToString, createID } from './id'
import { IndexDB, type LocalStorage } from './storage'

export type LoadableObject =
  | Node
  | {
      html: () => Node
    }

export class Generator {
  private readonly options: Options
  private readonly editor: Editor
  private readonly sandbox: HTMLIFrameElement
  private readonly storage: LocalStorage | IndexDB
  private active_id?: ID

  constructor() {
    this.options = new Options()
    this.storage = new IndexDB()

    this.editor = new Editor()
    this.sandbox = document.getElementById('sandbox')! as HTMLIFrameElement
    this.setupKeybinds()
    this.setupSandbox()

    // allow for going back to previous code using browser history
    addEventListener('popstate', () => {
      this.loadCode().catch(error)
    })
    // load initial code
    this.loadCode().catch(error)
  }

  async loadCode() {
    const path = window.location.pathname.replace('/', '')

    if (path.length === 0) return

    const id = IDFromString(path)

    if (id === null) {
      error('invalid id given')
      return
    }
    const value = await this.storage.get(id)
    if (value === null) {
      warn(`${IDToString(id)} not found in storage`)
      return
    }
    this.editor.setValue(value.code)
    this.active_id = id
  }

  setupSandbox() {
    const window = this.sandbox.contentWindow!

    window.document.body.style.margin = '0'

    const container = window.document.createElement('div')
    container.id = 'container'
    window.document.body.appendChild(container)

    for (const [k, v] of Object.entries(genart)) {
      window[k] = v
    }
    window.load = (obj: LoadableObject) => {
      if (obj instanceof Node) {
        container.appendChild(obj)
      } else {
        container.appendChild(obj.html())
      }
    }
  }

  setupKeybinds() {
    this.editor.addKeybind(
      monaco.KeyMod.Shift | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        this.render().catch(error)
      },
    )
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
        this.render().catch(error)
        event.preventDefault()
      }
    })
  }

  async render() {
    console.debug('rendering code')
    const code = this.editor.getValue()
    console.log(code)

    // store code and change url
    const id = await createID(code)
    await this.storage.set(id, { code })
    if (id.hash !== this.active_id?.hash) {
      window.history.pushState('Genart', '', IDToString(id))
      this.active_id = id
    }

    const doc = this.sandbox.contentDocument!

    doc.getElementById('container')!.innerHTML = ''

    doc.getElementById('script')?.remove()
    const script = doc.createElement('script')
    script.type = 'module'
    script.id = 'script'
    script.innerHTML = code
    doc.body.appendChild(script)

    this.options.render(this.sandbox)
  }
}
