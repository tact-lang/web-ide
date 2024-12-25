import { UserContract, useContractAction } from '@/hooks/contract.hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { LogType } from '@/interfaces/log.interface';
import {
  ABIField,
  ABIParameter,
  NetworkEnvironment,
} from '@/interfaces/workspace.interface';
import { TupleItem } from '@ton/core';
import { SandboxContract } from '@ton/sandbox';
import { Button, Form, Input, Select } from 'antd';
import { FC, useState } from 'react';
import s from './ABIUi.module.scss';

const { Option } = Select;

export interface ABIUiProps {
  abi: ABIField;
  contractAddress: string;
  network: NetworkEnvironment;
  contract: SandboxContract<UserContract> | null;
  type: 'Getter' | 'Setter';
}

type FormValues = Record<
  number,
  Record<
    string,
    {
      type: string;
      value: string;
    }
  >
>;

const ABIUi: FC<ABIUiProps> = ({
  abi,
  contractAddress,
  network,
  contract = null,
  type,
}) => {
  const possiblesTypes = (abi.parameters ?? []).map((item) => {
    if (['cell', 'slice'].includes(item.type)) {
      return [item.type, 'address'];
    }
    if (typeof item.type === 'string') {
      return [item.type];
    }
    return [(item.type as TupleItem).type];
  });

  const [isLoading, setIsLoading] = useState(false);
  const { createLog } = useLogActivity();
  const { callGetter, callSetter } = useContractAction();

  const onSubmit = async (formValues: FormValues) => {
    const stack = Object.values(formValues).map((param) => {
      const { type, value } = Object.values(param)[0];
      return { type: type, value: value };
    });

    try {
      setIsLoading(true);

      const callableFunction = type === 'Getter' ? callGetter : callSetter;

      const response = await callableFunction(
        contractAddress,
        abi.name,
        contract as SandboxContract<UserContract>,
        'func',
        'none',
        stack as TupleItem[],
        network,
      );

      if (Array.isArray(response)) {
        createLog(JSON.stringify(response));
      } else if (response?.logs) {
        for (const log of response.logs) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          createLog(log, (response?.status as LogType) ?? 'info');
        }
      } else {
        createLog(JSON.stringify(response));
      }
    } catch (error) {
      if ((error as Error).message.includes('no healthy nodes for')) {
        createLog(
          'No healthy nodes for this network. Redeploy your contract.',
          'error',
        );
        return;
      }
      if ((error as Error).message.includes('Invalid magic')) {
        createLog('Invalid magic(type)', 'error');
        return;
      }
      createLog((error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${s.root} ${s[type]}`}>
      <Form
        className={`${s.form} app-form`}
        onFinish={(values) => {
          onSubmit(values as FormValues).catch(() => {});
        }}
      >
        {(abi.parameters ?? []).map((item: ABIParameter, i: number) => {
          if (item.name === 'queryId') {
            return (
              <Form.Item
                noStyle
                key={i}
                name={[i, item.name, 'type']}
                className={`${s.formItemABI} ${s.formItemType}}`}
                rules={[{ message: 'Please select type' }]}
              >
                <Input type="hidden" value={0} />
              </Form.Item>
            );
          }
          return (
            <div key={i}>
              <Form.Item
                name={[i, item.name, 'type']}
                className={`${s.formItemABI} ${s.formItemType}}`}
                rules={[{ required: true, message: 'Please select type' }]}
              >
                <Select placeholder="select type">
                  {possiblesTypes[i].map((type, _j) => (
                    <Option key={`${i}-${_j}`} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name={[i, item.name, 'value']}
                className={s.formItemABI}
                rules={[{ required: true, message: 'Please input value' }]}
              >
                <Input
                  placeholder={`${item.name}: ${
                    typeof item.type === 'string'
                      ? item.type
                      : (item.type as TupleItem).type
                  }`}
                />
              </Form.Item>
            </div>
          );
        })}

        <Button
          className={`${s.btnAction} bordered-gradient`}
          type="default"
          htmlType="submit"
          loading={isLoading}
        >
          {abi.name || '-- fallback method --'}
        </Button>
      </Form>
    </div>
  );
};

export default ABIUi;
