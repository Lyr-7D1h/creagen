import React, { Children, PropsWithChildren, useEffect, useState } from 'react'
import { useSettings } from '../SettingsProvider'

/**
 * Split two given children and make them resizable
 *
 * each child must have a width prop
 */
export function VerticalSplitResizer({ children }: PropsWithChildren) {
  const settings = useSettings()
  const [editorWidth, setEditorWidth] = useState<number>(window.innerWidth / 4)
  const [resizing, setResizing] = useState(false)
  const [fullscreen, setFullscreen] = useState<boolean>(
    settings.values['editor.fullscreen'],
  )

  useEffect(() => {
    if (settings.values['editor.fullscreen'] === fullscreen) return
    setFullscreen(settings.values['editor.fullscreen'])
  }, [settings.values['editor.fullscreen']])

  const childrenArray = Children.toArray(children)
  if (childrenArray.length !== 2)
    throw Error('Resizer must have exactly 2 children')

  function handleMouseMove(e: MouseEvent) {
    if (e.clientX < 200 || e.clientX > window.innerWidth - 200) return
    setEditorWidth(e.clientX)
  }
  //on mouseup remove windows functions mousemove & mouseup
  function stopResize() {
    setResizing(false)
    window.removeEventListener('mousemove', handleMouseMove, false)
    window.removeEventListener('mouseup', stopResize, false)
  }
  function handleResize() {
    setResizing(true)
    window.addEventListener('mousemove', handleMouseMove, false)
    window.addEventListener('mouseup', stopResize, false)
  }

  return (
    <div style={{ display: 'flex' }}>
      {React.cloneElement(childrenArray[0] as any, {
        width: `${fullscreen ? window.innerWidth : editorWidth}px`,
      })}
      {fullscreen === false && (
        <>
          <div
            onMouseDown={handleResize}
            style={{
              cursor: 'ew-resize',
              height: '100%',
              width: '3px',
              position: 'absolute',
              top: 0,
              left: editorWidth,
              zIndex: 1001,
            }}
          />
          {resizing && (
            <div
              style={{
                top: 0,
                left: editorWidth,
                zIndex: 1001,
                // layer above sandbox which captures mouse events
                width: '800px',
                height: '100%',
                position: 'absolute',
              }}
            />
          )}
        </>
      )}
      {React.cloneElement(childrenArray[1] as any, {
        left: fullscreen ? 0 : editorWidth,
        width: fullscreen
          ? `${window.innerWidth}px`
          : `${window.innerWidth - editorWidth}px`,
        height: `${window.innerHeight}px`,
      })}
    </div>
  )
}
