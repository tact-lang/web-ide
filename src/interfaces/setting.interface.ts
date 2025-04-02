export interface SettingInterface {
  contractDebug: boolean;
  formatOnSave?: boolean;
  autoBuildAndDeploy?: boolean;
  editorMode: 'default' | 'vim';
  isExternalMessage?: boolean;
  theme?: 'light' | 'dark';
}
