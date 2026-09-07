import { defineConfig } from 'vitest/config';
import path from 'path';

const resolveJsToTs = {
  name: 'resolve-js-to-ts',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined) {
    if (source.endsWith('.js') && source.startsWith('.') && importer) {
      return path.join(path.dirname(importer), source.replace(/\.js$/, '.ts'));
    }
  }
};

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [resolveJsToTs],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
