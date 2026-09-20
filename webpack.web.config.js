const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  entry: './src/web/index.tsx',
  target: 'web',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: { loader: 'ts-loader', options: { compilerOptions: { module: 'esnext', moduleResolution: 'node' } } },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    conditionNames: ['import', 'module', 'browser', 'default'],
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
    },
  },
  externals: {
    // These native modules are stubs in the web bridge — provide empty module shims
    'manifold-3d': 'var {}',
    'opencascade.js': 'var {}',
  },
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: '[name].[contenthash].js',
    publicPath: 'auto',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/web/index.html',
    }),
    new webpack.DefinePlugin({
      'process.env.PLATFORM': JSON.stringify('web'),
      // Default baked in — a manual `npm run build:web` without the env var
      // must not ship a broken SKP converter (church example, .skp imports)
      '__SKP_CONVERT_URL__': JSON.stringify(
        process.env.SKP_CONVERT_URL || 'https://hzmbrm9pw6.us-east-1.awsapprunner.com',
      ),
      '__DWG_CONVERT_URL__': JSON.stringify(
        process.env.DWG_CONVERT_URL || 'https://nybay2a3oareyyzpdikktv3gsi0exbhq.lambda-url.us-east-1.on.aws/',
      ),
      '__BUG_REPORT_URL__': JSON.stringify(
        process.env.BUG_REPORT_URL || 'https://4ghrpkzeex7bnuacgrrzzco4oe0xvtdo.lambda-url.us-east-1.on.aws/',
      ),
    }),
  ],
  devServer: {
    port: 3001,
    hot: true,
    proxy: [
      { context: ['/__local_ai/lm'], target: 'http://127.0.0.1:1234', pathRewrite: { '^/__local_ai/lm': '' } },
      { context: ['/__local_ai/ollama'], target: 'http://127.0.0.1:11434', pathRewrite: { '^/__local_ai/ollama': '' } },
    ],
    historyApiFallback: true,
  },
  performance: {
    hints: false,
  },
};
