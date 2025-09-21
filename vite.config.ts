import { defineConfig, loadEnv } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  process.env = {
    ...loadEnv(mode, process.cwd()),
    ...process.env,
  }

  return {
    plugins: [
      dts({
        entryRoot: './src',
        outDir: './dist',
        insertTypesEntry: true,
        rollupTypes: true,
        include: ['src/**/*'],
      }),
    ],
    build: {
      lib: {
        entry: './src/index.ts',
        name: 'creagen',
        fileName: 'creagen',
        formats: ['es'],
      },
      sourcemap: true,
    },
    define: {
      CREAGEN_ASSERTS: JSON.stringify(isDev),
      CREAGEN_PRECISION: JSON.stringify(isDev ? 4 : 3),
    },
  }
})
