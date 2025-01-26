import { TYPESCRIPT_IMPORT_REGEX } from './constants'
import { GENART_VERSION, MODE } from './env'

export interface LibraryImport {
  name: string
  /** Specific version used ('{major}.{minor}.{patch}'), can't be latest or something else */
  version: string
  typings: () => Promise<string | null>
  /** Url, Absolute or relative path to library */
  importPath: string
}

const PACKAGE_SOURCE_URL = 'https://unpkg.com'

/** Takes care of handling proper typings and importing libraries */
// TODO: use https://unpkg.com/
export class Importer {
  /** Get a library, latest if version is not given */
  static async getLibrary(
    packageName: string,
    version?: string,
  ): Promise<LibraryImport | null> {
    // get local version of genart
    if (
      (packageName === '@lyr_7d1h/genart' || packageName === 'genart') &&
      MODE === 'dev'
    ) {
      if (MODE === 'dev') {
        return {
          name: packageName,
          version: GENART_VERSION,
          importPath: './genart.js',
          typings: async () => {
            const res = await fetch('./genart.d.ts')
            const typings = await res.text()
            return `declare module '${packageName}' {${typings}}`
          },
        }
      }
    }

    const url = `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}`
    let res = await fetch(`${url}/package.json`)
    const pkg = await res.json()

    version = pkg.version
    if (typeof version === 'undefined') throw Error('No version found')

    let typingsUrlRoot = `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}`
    let pkgTypings = pkg.typings || pkg.types
    if (typeof pkgTypings === 'undefined') {
      // if no typings are found, try to get the @types package
      typingsUrlRoot = `${PACKAGE_SOURCE_URL}/@types/${packageName}`
      let res = await fetch(`${typingsUrlRoot}/package.json`)
      const pkg = await res.json()
      pkgTypings = pkg.typings || pkg.types
      // HACK: using p5 in global mode
      if (packageName === 'p5') pkgTypings = 'global.d.ts'
      if (pkgTypings === null) throw Error('No typings found')
    }
    const typings = async () =>
      getTypings(packageName, typingsUrlRoot, pkgTypings)

    return {
      name: packageName,
      version,
      importPath: `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}`,
      typings,
    }
  }

  /** return a list of all the versions of a package from latest to oldest */
  static async versions(packageName: string) {
    const url = `https://registry.npmjs.org/${packageName}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch data for package: ${packageName}`)
    }
    const data = await response.json()
    const versions = Object.keys(data.versions)
    versions.reverse()
    return versions
  }
}

async function getTypings(packageName: string, root: string, typeFile: string) {
  const typings = await parseImports(root, typeFile)
  if (typings === null) return null
  return `declare module '${packageName}' {${typings}}`
}

async function parseImports(root: string, typeFile: string) {
  const response = await fetch(root + '/' + typeFile)
  if (response.status !== 200) {
    return null
  }
  let typings = await response.text()

  const matches = [...typings.matchAll(TYPESCRIPT_IMPORT_REGEX)]
  if (matches === null) return typings

  const modules = await Promise.all(
    matches.map(async (match) => {
      const module = match.groups!['module']
      if (typeof module === 'undefined') {
        console.error('module path couldnt be parsed')
        return ''
      }
      const parts = module.split('/')
      let parent = parts.splice(0, parts.length - 1).join('/')
      if (parent === '.') parent = ''
      return parseImports(`${root}/${parent}`, module + '.d.ts')
    }),
  )

  modules.forEach((module, i) => {
    if (module === null) return
    const match = matches[i]![0]
    if (typeof match === 'undefined') return
    typings = typings.replace(match, module)
  })
  // ignore exports
  typings = typings.replace(/export .*/g, '')

  return typings
}
