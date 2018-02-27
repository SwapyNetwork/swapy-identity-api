'use strict'

// Webpack
const webpack = require('webpack')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

let libraryName = 'api'

// Final Config
module.exports = {
  entry: ['./src/index.js'],
  devtool: 'source-map',
  output: {
    filename: 'dist/api.min.js',
    library: 'IdentityAPI',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
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
  plugins: [
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false
    }),
    new UglifyJsPlugin(),
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify('production') }
    })
  ]
}
