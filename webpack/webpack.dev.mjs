import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import { merge } from "webpack-merge";
import commonConfig from "./webpack.common.mjs";

const devConfig = merge(commonConfig, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    historyApiFallback: true,
    hot: true,
    liveReload: false,
    port: 3000,
    client: {
      overlay: false,
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },

  plugins: [new ReactRefreshWebpackPlugin()],
});

export default devConfig;
