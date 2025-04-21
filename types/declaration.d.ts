declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.wasm' {
  const value: string;
  export default value;
}

declare module '*?worker' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
