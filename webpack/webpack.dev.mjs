import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import detectPort from "detect-port";
import { merge } from "webpack-merge";
import commonConfig from "./webpack.common.mjs";

const DEFAULT_PORT = 3000;
const COLORS = {
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

async function getAvailablePort() {
  const availablePort = await detectPort(DEFAULT_PORT);

  if (availablePort !== DEFAULT_PORT) {
    console.log(
      `${COLORS.yellow}⚠️ Port ${DEFAULT_PORT} is occupied. Using available port ${availablePort} instead.${COLORS.reset}`,
    );
  }

  return availablePort;
}
const devConfig = async () => {
  const availablePort = await getAvailablePort();

  return merge(commonConfig, {
    mode: "development",
    devtool: "eval-cheap-module-source-map",
    devServer: {
      historyApiFallback: true,
      hot: true,
      liveReload: false,
      port: availablePort,
      client: { overlay: false },
      headers: {
        "Cross-Origin-Embedder-Policy": "credentialless",
        "Cross-Origin-Opener-Policy": "same-origin",
      },
      setupExitSignals: true,
    },
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: 1000,
    },
    optimization: {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    },
    plugins: [new ReactRefreshWebpackPlugin()],
  });
};

export default devConfig;
