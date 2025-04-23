import { Form, Input } from 'antd';
import { FC } from 'react';
import s from './ABIUi.module.scss';
interface Props {
  name?: string;
}

export const TonInputValue: FC<Props> = ({ name = 'tonValue' }) => {
  return (
    <Form.Item
      name={name}
      className={`${s.tonInputValue} ${s.nestedForm}`}
      required
      rules={[
        {
          validator: (_, value) => {
            if (value === undefined || value === null || value === '') {
              return Promise.reject(new Error('TON value is required'));
            }
            if (value === undefined || value === null || isNaN(value)) {
              return Promise.reject(new Error('Value must be a valid number'));
            }
            if (value <= 0) {
              return Promise.reject(
                new Error('Value must be a positive number'),
              );
            }
            return Promise.resolve();
          },
        },
      ]}
      label="TON Value"
    >
      <Input placeholder="value" suffix="TON" />
    </Form.Item>
  );
};
