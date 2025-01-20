import { GENART_VERSION, MODE } from './env'

export interface Library {
  name: string
  /** Specific version used ('{major}.{minor}.{patch}'), can't be latest or something else */
  version: string
  typings: () => Promise<string>
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
  ): Promise<Library | null> {
    console.log('getLibrary', packageName, MODE)
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

    const pkgTypings = pkg.typings || pkg.types
    let typings
    if (typeof pkgTypings === 'undefined') {
      // if no typings are found, try to get the @types package
      const url = `${PACKAGE_SOURCE_URL}/@types/${packageName}`
      let res = await fetch(`${url}/package.json`)
      const pkg = await res.json()
      let pkgTypings = pkg.typings || pkg.types
      // HACK: using p5 in global mode
      if (packageName === 'p5') pkgTypings = 'global.d.ts'
      if (pkgTypings === null) throw Error('No typings found')
      typings = async () => {
        res = await fetch(
          `${PACKAGE_SOURCE_URL}/@types/${packageName}/${pkgTypings}`,
        )
        let body = await res.text()
        return `declare module '${packageName}' {${body}}`
      }
    } else {
      typings = async () => {
        res = await fetch(
          `${PACKAGE_SOURCE_URL}/${packageName}${version ? `@${version}` : ''}/${pkgTypings}`,
        )
        let body = await res.text()
        return `declare module '${packageName}' {${body}}`
      }
    }

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
