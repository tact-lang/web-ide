/** @type {import('next').NextConfig} */

const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const withTM = require("next-transpile-modules")([
  "monaco-editor",
  "@tact-lang/opcode",
]);
const webpack = require("webpack");

const nextConfig = withTM({
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, options) => {
    config.resolve.fallback = { fs: false };
    config.resolve.alias = {
      ...config.resolve.alias,
      vscode: require.resolve(
        "@codingame/monaco-languageclient/lib/vscode-compatibility",
      ),
    };

    config.resolve.extensions.push(".js");

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );

    if (!options.isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ["typescript", "json"],
          filename: "static/[name].worker.js",
        }),
      );
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
});

module.exports = nextConfig;
