const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = [
  {
    entry: './js/main.js',
    output: {
      filename: 'bundle.min.js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: [
      //new UglifyJSPlugin()
    ]
  },
  {
    entry: './js/tools/mesh-import/main.js',
    output: {
      filename: 'import-tool.bundle.min.js',
      path: path.resolve(__dirname, 'dist')
    },
    plugins: [
      //new UglifyJSPlugin()
    ]
  }
];