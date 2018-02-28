'use strict';

// Webpack
const webpack = require('webpack')

// Plugin Setup
const globalsPlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse(process.env.BUILD_DEV || 'true')),
  'process.env': { 'NODE_ENV': JSON.stringify('development') }
})

let libraryName = 'api'

// Final Config
module.exports = {
  entry: ['./src/index.js'],
  output: {
    filename: 'dist/api.js',
    library: 'IdentityAPI',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader'
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  },
  node: {
    console: false,
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  resolve: {
    modules: [ './src', 'node_modules' ],
    extensions: ['.js', '.json']
  },
  devServer: {
    headers: {
        'Access-Control-Allow-Origin': '*'
    }
  },
  plugins: [
    globalsPlugin
  ]
}
