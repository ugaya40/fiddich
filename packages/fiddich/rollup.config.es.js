import typescript from 'rollup-plugin-typescript2';

export default {
  input: "./src/index.ts",
  output: {
    dir: "./dist",
    format: "es",
    sourcemap: true,
  },
  external: [
    'react',
    'react/jsx-runtime'
  ],
  plugins: [
    typescript(),
  ],
  onwarn: (warning, warn) => {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  }
}