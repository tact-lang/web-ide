export const vscodeLight = {
  base: 'vs' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    {
      token: 'comment.block.tact',
      foreground: '008000',
      fontStyle: 'italic',
    },
    {
      token: 'comment.line.double-slash.tact',
      foreground: '008000',
      fontStyle: 'italic',
    },
    {
      token: 'punctuation.definition.comment',
      foreground: '008000',
      fontStyle: 'italic',
    },
  ],
  colors: {
    'editor.foreground': '#000000',
    'editor.background': '#FFFFFF',
  },
};
