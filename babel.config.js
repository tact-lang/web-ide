module.exports = {
  presets: [
    "@babel/preset-env",
    ["@babel/preset-react", { runtime: "automatic" }],
    "@babel/preset-typescript",
  ],
  plugins:
    process.env.NODE_ENV === "development" ? ["react-refresh/babel"] : [],
};
