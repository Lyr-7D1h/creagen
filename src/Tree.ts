/** Branded type for tree node IDs - can only be created by Tree.new() */
export type NodeId<T = unknown> = number & {
  readonly __brand: 'NodeId'
  readonly __tree: T
}

const MAX = 0xffffffff
export class Tree<T> {
  values: Array<T> = []
  firstChild: Uint32Array
  nextSibling: Uint32Array
  parent: Uint32Array
  private capacity: number = 0
  private size: number = 0

  static create<T>(initialCapacity: number = 1000) {
    return new Tree<T>(initialCapacity)
  }

  private constructor(initialCapacity: number = 1000) {
    this.capacity = initialCapacity
    this.firstChild = new Uint32Array(initialCapacity).fill(MAX) // Use max uint32 as null
    this.nextSibling = new Uint32Array(initialCapacity).fill(MAX)
    this.parent = new Uint32Array(initialCapacity).fill(MAX)
  }

  private resize(newCapacity: number) {
    const oldFirstChild = this.firstChild
    const oldNextSibling = this.nextSibling
    const oldParent = this.parent

    this.firstChild = new Uint32Array(newCapacity).fill(MAX)
    this.nextSibling = new Uint32Array(newCapacity).fill(MAX)
    this.parent = new Uint32Array(newCapacity).fill(MAX)

    this.firstChild.set(oldFirstChild)
    this.nextSibling.set(oldNextSibling)
    this.parent.set(oldParent)

    this.capacity = newCapacity
  }

  new(body: T): NodeId<T> {
    const idx = this.size
    if (CREAGEN_ASSERTS && idx >= 2147483647) throw Error('Invalid tree size')

    if (idx >= this.capacity) {
      this.resize(this.capacity * 2)
    }

    this.values.push(body)
    this.size++

    return idx as NodeId<T>
  }

  get(id: NodeId<T>): T
  get(id: number): T
  get(id: NodeId<T> | number): T {
    if (CREAGEN_ASSERTS)
      if (id < 0 || id >= this.size) throw Error(`Invalid idx given ${id}`)
    return this.values[id]
  }

  getParent(id: NodeId<T>): NodeId<T> | null
  getParent(id: number): NodeId<T> | null
  getParent(id: NodeId<T> | number): NodeId<T> | null {
    if (CREAGEN_ASSERTS)
      if (id < 0 || id >= this.size) throw Error(`Invalid idx given ${id}`)
    const val = this.parent[id]
    return val === MAX ? null : (val as NodeId<T>)
  }

  setParent(id: NodeId<T>, parentId: NodeId<T> | null): void
  setParent(id: number, parentId: NodeId<T> | number | null): void
  setParent(id: NodeId<T> | number, parentId: NodeId<T> | number | null): void {
    if (CREAGEN_ASSERTS)
      if (id < 0 || id >= this.size) throw Error(`Invalid idx given ${id}`)
    const parentIdx = parentId === null ? MAX : parentId
    this.parent[id] = parentIdx
  }

  getFirstChild(id: NodeId<T>): NodeId<T> | null
  getFirstChild(id: number): NodeId<T> | null
  getFirstChild(id: NodeId<T> | number): NodeId<T> | null {
    if (CREAGEN_ASSERTS)
      if (id < 0 || id >= this.size) throw Error(`Invalid idx given ${id}`)
    const val = this.firstChild[id]
    return val === MAX ? null : (val as NodeId<T>)
  }

  setFirstChild(id: NodeId<T>, childId: NodeId<T> | null): void
  setFirstChild(id: number, childId: NodeId<T> | number | null): void
  setFirstChild(
    id: NodeId<T> | number,
    childId: NodeId<T> | number | null,
  ): void {
    if (CREAGEN_ASSERTS)
      if (id < 0 || id >= this.size) throw Error(`Invalid idx given ${id}`)
    const childIdx = childId === null ? MAX : childId

    this.firstChild[id] = childIdx
  }

  getNextSibling(id: NodeId<T>): NodeId<T> | null
  getNextSibling(id: number): NodeId<T> | null
  getNextSibling(id: NodeId<T> | number): NodeId<T> | null {
    if (CREAGEN_ASSERTS)
      if (id < 0 || id >= this.size) throw Error(`Invalid idx given ${id}`)
    const val = this.nextSibling[id]
    return val === MAX ? null : (val as NodeId<T>)
  }

  setNextSibling(id: NodeId<T>, siblingId: NodeId<T> | null): void
  setNextSibling(id: number, siblingId: NodeId<T> | number | null): void
  setNextSibling(
    id: NodeId<T> | number,
    siblingId: NodeId<T> | number | null,
  ): void {
    if (CREAGEN_ASSERTS)
      if (id < 0 || id >= this.size) throw Error(`Invalid idx given ${id}`)
    const siblingIdx = siblingId === null ? MAX : siblingId
    this.nextSibling[id] = siblingIdx
  }

  getPrevSibling(id: NodeId<T>): NodeId<T> | null
  getPrevSibling(id: number): NodeId<T> | null
  getPrevSibling(id: NodeId<T> | number): NodeId<T> | null {
    const parentId = this.getParent(id)
    if (parentId === null) return null

    let current = this.getFirstChild(parentId)
    let previous: NodeId<T> | null = null
    const targetId = typeof id === 'number' ? (id as NodeId<T>) : id

    while (current !== null && current !== targetId) {
      previous = current
      current = this.getNextSibling(current)
    }

    return previous
  }

  addChild(parentId: NodeId<T>, childId: NodeId<T>): void
  addChild(parentId: number, childId: number): void
  addChild(parentId: NodeId<T> | number, childId: NodeId<T> | number): void {
    this.setParent(childId, parentId)

    if (this.getFirstChild(parentId) === null) {
      this.setFirstChild(parentId, childId)
    } else {
      // Add as sibling - find the last sibling
      let current = this.getFirstChild(parentId)!
      let next = this.getNextSibling(current)

      while (next !== null) {
        current = next
        next = this.getNextSibling(current)
      }

      this.setNextSibling(current, childId)
    }
  }

  /**
   * Gets the first root node found in the tree (a node with parent = null)
   * Returns null if no root is found
   */
  getRoot(): NodeId<T> | null {
    for (let i = 0; i < this.size; i++) {
      if (this.parent[i] === MAX) {
        return i as NodeId<T>
      }
    }
    return null
  }

  /**
   * Gets all root nodes in the tree (nodes with parent = null)
   * Returns an empty array if no roots are found
   */
  getRoots(): NodeId<T>[] {
    const roots: NodeId<T>[] = []
    for (let i = 0; i < this.size; i++) {
      if (this.parent[i] === MAX) {
        roots.push(i as NodeId<T>)
      }
    }
    return roots
  }

  /**
   * Generator that yields all direct children of a node (in order).
   */
  *children(id: NodeId<T> | number): Generator<NodeId<T>, void, void> {
    let child = this.getFirstChild(id)
    while (child !== null) {
      yield child
      child = this.getNextSibling(child)
    }
  }
}
