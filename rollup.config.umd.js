import typescript from 'rollup-plugin-typescript2';
import { terser } from "rollup-plugin-terser"


export default {
  input: "./src/index.ts",
  output: {
    name: 'fiddich',
    file: "./dist/index.umd.js",
    format: "umd",
    sourcemap: true
  },
  plugins: [
    terser({keep_fnames:true}),
    typescript(),
  ]
}