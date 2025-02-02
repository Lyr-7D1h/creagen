export type LoadableObject =
  | Node
  | {
      html: () => Node
    }

/** Load a html loadable object into #canvas-container */
export function load(loadableObject: LoadableObject) {
  let container = document.getElementById('canvas-container')
  if (container === null) {
    container = document.body
  }

  if (loadableObject instanceof Node) {
    container.appendChild(loadableObject)
    return
  }
  container.appendChild(loadableObject.html())
}
