const projectGithub =
  process.env.REACT_APP_PROJECT_GITHUB_URL?.trim() ||
  'https://github.com/YOUR_ORG/ton-ide';

export const AppData = {
  socials: [
    {
      label: 'Project GitHub',
      icon: 'GitHub',
      url: projectGithub,
    },
    {
      label: 'Telegram',
      icon: 'Telegram',
      url: 'https://t.me/ton_web_IDE',
    },
  ],
};
