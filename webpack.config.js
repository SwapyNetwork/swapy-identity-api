const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/index',
	output: {
        path: path.join(__dirname, 'lib'),
        filename: 'bundle.min.js'
	},
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader'
        }]
    },
    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    },
    resolve: {
        modules: [ './src', 'node_modules' ],
        extensions: ['.js', '.json']
    },
    devtool: 'cheap-module-eval-source-map',
    devServer: {
        contentBase: path.join(__dirname, 'lib')
    },
    plugins: [
        new webpack.LoaderOptionsPlugin({
          minimize: true,
          debug: false
        }),
        new webpack.optimize.UglifyJsPlugin({
          sourceMap: true
        }),
        new webpack.DefinePlugin({
            'process.env': {
              'NODE_ENV': JSON.stringify('production')
            }
        })
    ]
};