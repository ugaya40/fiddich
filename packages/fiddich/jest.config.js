export default {
  transform: {
    '^.+\\.(j|t)sx?$': [
      'ts-jest'
    ],
  },
  transformIgnorePatterns: [`node_modules/(?!nanoid/)`]
};