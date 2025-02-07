import { Address } from '@ton/core';
import { Form, Input } from 'antd';
import { Rule, RuleObject } from 'antd/es/form';

interface Props {
  name?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  rules?: Rule[];
}

const AddressInput = ({
  name = 'address',
  label,
  placeholder = 'EQDPK...0nYxC',
  className = '',
  rules = [],
}: Props) => {
  const fieldRules = [
    ...rules,
    () => ({
      validator(_rule: RuleObject, value: string) {
        if (!value) return Promise.resolve();
        try {
          Address.parse(value);
        } catch {
          return Promise.reject('Invalid Address');
        }

        return Promise.resolve();
      },
    }),
  ];
  return (
    <Form.Item
      name={name}
      label={label}
      rules={fieldRules}
      className={className}
    >
      <Input placeholder={placeholder} />
    </Form.Item>
  );
};

export default AddressInput;
