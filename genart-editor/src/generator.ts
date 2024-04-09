import * as genart from '@lyr_7d1h/genart'
import * as monaco from 'monaco-editor'
import { Editor, type EditorSettings } from './editor'
import { Options } from './options'
import { error, warn } from './error'
import { type ID, IDFromString, IDToString, createID } from './id'
import { IndexDB, type LocalStorage } from './storage'

export type LoadableObject =
  | Node
  | {
      html: () => Node
    }

export interface Settings {
  editor: EditorSettings
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
    this.setupOptions()
    this.setupResizer()

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

  setupOptions() {
    this.options.addParam(
      'Editor',
      'opacity',
      1,
      (v) => {
        this.editor.setOpacity(v)
      },
      { min: 0, max: 1 },
    )
    this.options.addParam('Editor', 'vim', false, (v) => {
      this.editor.setVimMode(v)
    })
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

  setupResizer() {
    const editor = this.editor
    const sandbox = this.sandbox

    const resizer = document.getElementById('resizer')!
    function move(e: MouseEvent) {
      const editorWidth = e.clientX
      sandbox.style.left =
        resizer.style.left =
        editor.html().style.width =
          editorWidth + 'px'
      sandbox.style.width = screen.width - editorWidth + 'px'
    }
    function up() {
      document.removeEventListener('mouseup', up, false)
      document.removeEventListener('mousemove', move, false)
    }
    resizer.addEventListener(
      'mousedown',
      () => {
        document.addEventListener('mouseup', up, false)
        document.addEventListener('mousemove', move, false)
      },
      false,
    )
  }

  async render() {
    console.debug('rendering code')
    const code = this.editor.getValue()

    // store code and change url
    const id = await createID(code)
    await this.storage.set(id, {
      code,
      createdOn: id.date,
      previous: this.active_id,
    })
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
    // TODO: wait for execution
    doc.body.appendChild(script)

    setTimeout(() => {
      this.options.updateRenderOptions(
        this.sandbox.contentDocument!.getElementById('container')!,
      )
    }, 300)
  }
}
