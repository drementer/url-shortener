import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: false,
    minify: true,
  },
  treeshake: true,
  /**
   * Pattern to match all bare module IDs (not starting with . or /)
   * and .json files (loaded at runtime)
   */
  external: [/^[^./]/, /\.json$/],
});
