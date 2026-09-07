import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'path';

config();

const resolveJsToTs = {
  name: 'resolve-js-to-ts',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined) {
    if (source.endsWith('.js') && source.startsWith('.') && importer) {
      return path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts'));
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
    include: ['**/*.e2e-spec.ts'],
  },
});
