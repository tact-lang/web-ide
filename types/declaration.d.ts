declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.wasm' {
  const value: string;
  export default value;
}
