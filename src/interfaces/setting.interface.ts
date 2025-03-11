export interface SettingInterface {
  contractDebug: boolean;
  formatOnSave?: boolean;
  autoBuildAndDeploy?: boolean;
  tonAmountForInteraction?: string;
  editorMode: 'default' | 'vim';
  isExternalMessage?: boolean;
  theme?: 'light' | 'dark';
}
