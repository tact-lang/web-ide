import { BUNDLED_PLUGIN, getEnabledPlugins, registerPlugin, removePlugin } from './registry';
import { loadPluginFromUrl } from './loader';
import { Button, Input, List } from 'antd';
import { FC, useState } from 'react';

const PluginSettings: FC = () => {
  const [url, setUrl] = useState('');
  const [plugins, setPlugins] = useState(getEnabledPlugins());
  const [error, setError] = useState('');

  const refresh = () => { setPlugins(getEnabledPlugins()); };

  return (
    <div style={{ maxWidth: 320 }}>
      <List
        size="small"
        dataSource={plugins}
        renderItem={(p) => (
          <List.Item
            actions={[
              <Button
                key="rm"
                type="link"
                size="small"
                onClick={() => {
                  removePlugin(p.id);
                  refresh();
                }}
              >
                Remove
              </Button>,
            ]}
          >
            {p.name} ({p.id})
          </List.Item>
        )}
      />
      <Input
        placeholder="https://.../ton-ide-plugin.json"
        value={url}
        onChange={(e) => { setUrl(e.target.value); }}
        style={{ marginTop: 8 }}
      />
      {error && <p style={{ color: 'crimson', fontSize: 11 }}>{error}</p>}
      <Button
        size="small"
        style={{ marginTop: 8 }}
        onClick={async () => {
          try {
            setError('');
            await loadPluginFromUrl(url);
            setUrl('');
            refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Add plugin URL
      </Button>
      <Button
        size="small"
        style={{ marginTop: 8, marginLeft: 8 }}
        onClick={() => {
          registerPlugin(BUNDLED_PLUGIN);
          refresh();
        }}
      >
        Add bundled TEP-74
      </Button>
    </div>
  );
};

export default PluginSettings;
