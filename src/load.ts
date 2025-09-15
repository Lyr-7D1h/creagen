export type LoadableObject =
  | Node
  | {
      html: () => Node
    }
  | {
      html: () => Promise<Node>
    }

/** Load a html loadable object into #canvas-container */
export async function load(loadableObject: LoadableObject) {
  let container = document.getElementById('canvas-container')
  if (container === null) {
    container = document.body
  }

  if (loadableObject instanceof Node) {
    container.appendChild(loadableObject)
    return
  }
  const html = await loadableObject.html()
  container.appendChild(html)
}
