import { SendMode } from '@ton/core';
import { Form, Select } from 'antd';
import { FC } from 'react';

const sendModeOptions = Object.entries(SendMode)
  .filter(([_, value]) => typeof value === 'number')
  .map(([key, value]) => ({
    value: value as number,
    label: key.toLocaleUpperCase(),
  }));

interface Props {
  name?: string;
}

export const TonSendMode: FC<Props> = ({ name = 'sendMode' }) => {
  return (
    <Form.Item
      name={name}
      rules={[{ required: true, message: 'Please select Send Mode' }]}
      label="Send Mode"
    >
      <Select mode="multiple" options={sendModeOptions} showSearch={false} />
    </Form.Item>
  );
};
