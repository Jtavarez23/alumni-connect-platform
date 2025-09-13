module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxRuntime: 'automatic',
      }],
    ],
    plugins: [
      ['@babel/plugin-transform-typescript', {
        allowDeclareFields: true,
      }],
      '@babel/plugin-transform-modules-commonjs',
    ],
    env: {
      test: {
        plugins: [
          ['@babel/plugin-transform-typescript', {
            allowDeclareFields: true,
            isTSX: true,
            allExtensions: true,
          }],
        ],
      },
    },
  };
};