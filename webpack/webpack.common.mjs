import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import Dotenv from "dotenv-webpack";
import ESLintWebpackPlugin from "eslint-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import path from "path";
import webpack from "webpack";

export default {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(process.cwd(), "dist"),
    filename: "js/[name].[contenthash].js",
    chunkFilename: "js/[name].[contenthash].js",
    publicPath: "/",
  },
  cache: {
    type: "filesystem",
    compression: "gzip",
    maxAge: 7 * 24 * 60 * 60 * 1000, // Auto-clean cache older than 7 days
  },
  resolve: {
    alias: {
      vscode: path.resolve(
        process.cwd(),
        "node_modules/@codingame/monaco-languageclient/lib/vscode-compatibility",
      ),
      "@": path.resolve(process.cwd(), "src"),
    },
    fallback: {
      fs: false,
      child_process: false,
      process: false,
      "timers/promises": false,
      async_hooks: false,
    },
    extensions: [".tsx", ".ts", ".js", ".scss"],
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        type: "json",
      },
      {
        test: /\.worker\.ts$/,
        use: { loader: "worker-loader" },
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        include: [
          path.resolve("src"),
          path.resolve("node_modules/monaco-editor"), // Transpile monaco-editor
          path.resolve("node_modules/@tact-lang/opcode"), // Transpile @tact-lang/opcode
        ],
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              cacheCompression: false,
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.module\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: {
                namedExport: false,
                localIdentName: "[name]__[local]--[hash:base64:5]",
                exportLocalsConvention: "as-is",
              },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]",
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
        type: "asset/resource",
      },
      {
        test: /\.wasm$/,
        loader: "file-loader",
        type: "javascript/auto",
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      favicon: "./public/images/logo.svg",
    }),
    new ESLintWebpackPlugin({ extensions: ["js", "jsx", "ts", "tsx"] }),
    new NodePolyfillPlugin(),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
    new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
      resource.request = resource.request.replace(/^node:/, "");
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^timers\/promises$/,
    }),

    // TODO: Remove this workaround once the Misti library is updated to handle dynamic imports properly for Souffle.
    //       Instead of suppressing the warning, update @nowarp/misti to use explicit imports
    //       or provide better Webpack compatibility.
    new webpack.ContextReplacementPlugin(
      /@nowarp\/misti\/dist\/cli/,
      (data) => {
        delete data.dependencies[0].critical; // Suppress warning
        return data;
      },
    ),
    new MonacoWebpackPlugin({
      languages: ["typescript", "json"],
      filename: "static/[name].worker.js",
    }),
    new MiniCssExtractPlugin({ filename: "css/[name].[contenthash].css" }),
    new CopyWebpackPlugin({
      patterns: [{ from: "public", to: "." }],
    }),
    new Dotenv(),
  ],
};
