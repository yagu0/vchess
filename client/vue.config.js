module.exports = {
  lintOnSave: false,
  configureWebpack: {
    output: {
      // Fix "window is not defined" issues with web worker.
      // https://github.com/webpack/webpack/issues/6642
      globalObject: 'this',
    },
  },
};
