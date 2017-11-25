const path = require('path');
const utils = require('./utils');
const webpack = require('webpack');
const vueLoaderConfig = require('./vue-loader.conf')

process.env.NODE_ENV = 'production';

function resolve (dir) {
  return path.join(__dirname, '..', dir);
}

module.exports = {
  entry: resolve('src/JsonEditor.vue'),
  output: {
    path: path.resolve(__dirname, '../lib'),
    publicPath: '/lib/',
    filename: 'json-editor.min.js',
    library: 'json-editor',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /\.(js|vue)$/,
        loader: 'eslint-loader',
        enforce: 'pre',
        include: [resolve('src'), resolve('test')],
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: __dirname,
        exclude: /node_modules/,
        query: { compact: false }
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  externals: {
    vue: {
      root: 'Vue',
      commonjs: 'vue',
      commonjs2: 'vue',
      amd: 'vue'
    }
  },
  resolve: {
    extensions: ['.js', '.vue'],
    alias: {
      'vue': 'vue/dist/vue.esm.js',
      '@': resolve('src')
    }
  },
  plugins: [
    // @todo
    new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"production"'
    }),
    // @todo
    // new webpack.optimize.UglifyJsPlugin( {
    //   minimize : true,
    //   sourceMap : false,
    //   mangle: true,
    //   parallel: true,
    //   compress: {
    //     warnings: false
    //   }
    // })
  ],
};