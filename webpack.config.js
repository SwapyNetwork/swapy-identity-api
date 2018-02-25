
'use strict';

const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const webpack = require('webpack');
let libraryName = 'swapy-identity-api'

module.exports = {
    entry: ['babel-polyfill','./src/index.js'],
	output: {
        path: path.join(__dirname, 'lib'),
        filename: 'bundle.min.js',
        libraryTarget: 'umd',
        library: libraryName,
        umdNamedDefine: true
	},
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader'
        }]
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
    devtool: 'source-map',
    devServer: {
        contentBase: path.join(__dirname, 'lib')
    }//,
    // plugins: [
    //     new webpack.LoaderOptionsPlugin({
    //       minimize: true,
    //       debug: false
    //     }),
    //     new UglifyJsPlugin(),
    //     new webpack.DefinePlugin({
    //         'process.env': {
    //           'NODE_ENV': JSON.stringify('production')
    //         }
    //     })
    // ]
};