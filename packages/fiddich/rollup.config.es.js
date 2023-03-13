import typescript from 'rollup-plugin-typescript2';

export default {
  input: "./src/index.ts",
  preserveModules: true,
  output: {
    dir: "./dist",
    format: "es",
    sourcemap: true
  },
  external: [
    'react',
    'react/jsx-runtime'
  ],
  plugins: [
    typescript(),
  ]
}