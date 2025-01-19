import React, { useEffect, useRef, useState } from 'react'
import AutoImport from '@kareemkermad/monaco-auto-import'
import { editor } from 'monaco-editor'
import MonacoEditor, { Monaco } from '@monaco-editor/react'
import { initVimMode } from 'monaco-vim'
import { useSettings } from '../../SettingsProvider'
import { loader } from '@monaco-editor/react'
import { Editor } from './editor'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// needed for vite: https://www.npmjs.com/package/@monaco-editor/react#loader-config
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

export const typescriptCompilerOptions = {
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.Classic,
  esModuleInterop: true,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  noEmit: true,
}

// Use monaco without cdn: https://www.npmjs.com/package/@monaco-editor/react#loader-config
loader.config({ monaco })

const genartLightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  colors: {},
  rules: [],
}
const genartFullscreenTheme: monaco.editor.IStandaloneThemeData = {
  base: 'hc-black',
  inherit: true,
  colors: {
    'editor.background': '#ffffff00',
    'editor.selectionBackground': '#ffffff',
    'editor.lineHighlightBackground': '#00000088',
    'editorCursor.foreground': '#ffffff',
  },
  rules: [],
}

export interface EditorProps {
  value?: string
  width?: string
  height?: string
  minimap?: boolean
  onLoad?: (editor: Editor) => void
}

export function EditorView({ value, width, height, onLoad }: EditorProps) {
  const editorRef = useRef<Editor>(null)
  const settings = useSettings()

  /** Update editor based on global settings */
  function update(editor: Editor) {
    editor.setVimMode(settings.values['editor.vim'])
    editor.setFullscreenMode(settings.values['editor.fullscreen'])
    if (settings.values['editor.relative_lines']) {
      editor.updateOptions({ lineNumbers: 'relative' })
    } else {
      editor.updateOptions({ lineNumbers: 'on' })
    }
  }

  // if (editorRef.current !== null) {
  useEffect(() => {
    if (editorRef.current === null) return
    update(editorRef.current)
  }, [
    settings.values['editor.vim'],
    settings.values['editor.fullscreen'],
    settings.values['editor.relative_lines'],
    editorRef,
  ])

  function handleBeforeMount(monaco: Monaco) {
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      // 1378,1375: allow await on top level
      diagnosticCodesToIgnore: [1375, 1378],
    })
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
      typescriptCompilerOptions,
    )
    monaco.editor.defineTheme('genart', genartLightTheme)
    monaco.editor.defineTheme('genart-fullscreen', genartFullscreenTheme)
  }

  function handleEditorDidMount(
    monacoEditor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    const editor = new Editor(monacoEditor, monaco)
    editorRef.current = editor

    update(editor)
    if (typeof onLoad !== 'undefined') onLoad(editor)
  }

  return (
    <>
      <MonacoEditor
        width={width}
        height={height}
        defaultValue={value ?? ''}
        language="typescript"
        theme="genart"
        beforeMount={handleBeforeMount}
        onMount={handleEditorDidMount}
        loading={<div>Loading...</div>}
        value=""
        options={{
          minimap: { enabled: false },
          tabSize: 2,
          // TODO: formatting
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,

          // allow for resizing
          automaticLayout: true,
        }}
      />
      {settings.values['editor.vim'] && (
        <div
          id="vim-status"
          style={{ position: 'absolute', bottom: 0, left: 20 }}
        />
      )}
    </>
  )
}
