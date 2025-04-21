import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import { merge } from "webpack-merge";
import commonConfig from "./webpack.common.mjs";

const prodConfig = merge(commonConfig, {
  mode: "production",
  devtool: false,
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: "some",
        terserOptions: {
          compress: true,
        },
        exclude: /chunk-nowarp-misti.*\.js$/,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: "all",
      maxSize: 5000000,
      minSize: 100000,
      cacheGroups: {
        // Place @nowarp/misti in a separate chunk to prevent minification by Terser.
        // This ensures that detector names and other identifiers remain readable.
        nowarpMisti: {
          test: /[\\/]node_modules[\\/]@nowarp[\\/]misti[\\/]/,
          name: "chunk-nowarp-misti",
          chunks: "all",
          enforce: true,
          priority: 10,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 1,
        },
      },
    },
    runtimeChunk: "single",
  },
});

export default prodConfig;
