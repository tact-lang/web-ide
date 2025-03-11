interface ImportMeta {
  webpackHot?: {
    accept: (path?: string, callback?: () => void) => void;
    addStatusHandler: (handler: (status: string) => void) => void;
    removeStatusHandler: (handler: (status: string) => void) => void;
  };
}
