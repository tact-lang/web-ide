import { Tooltip } from '@/components/ui';
import AppIcon from '@/components/ui/icon';
import { ExitCodes } from '@/constant/exitCodes';
import { UserContract, useContractAction } from '@/hooks/contract.hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { LogType } from '@/interfaces/log.interface';
import {
  TactABIField,
  TactInputFields,
  TactType,
  Tree,
} from '@/interfaces/workspace.interface';
import { parseInputs } from '@/utility/abi';
import { EXIT_CODE_PATTERN } from '@/utility/text';
import { isIncludesTypeCellOrSlice } from '@/utility/utils';
import { MinusCircleOutlined } from '@ant-design/icons';
import { Address, Contract, TupleItem } from '@ton/core';
import { SandboxContract } from '@ton/sandbox';
import { Button, Form, Input, Popover, Radio, Select, Switch } from 'antd';
import { Rule, RuleObject } from 'antd/es/form';
import { useForm } from 'antd/lib/form/Form';
import { FC, Fragment, useEffect, useState } from 'react';
import { ABIUiProps } from './ABIUi';
import s from './ABIUi.module.scss';

const comptimeSliceDescriptions: Record<'slice' | 'rawSlice', string> = {
  slice:
    'A compile-time function that embeds a base64-encoded BoC (bocBase64) as a Slice into the contract.',
  rawSlice:
    'A compile-time function that converts hex String with hex-encoded and optionally bit-padded contents as a Slice and embeds it into the contract.',
};

function getValidtionRule(field: TactABIField) {
  let rules: Rule[] = [];
  if (field.type.kind === 'simple') {
    rules = [
      {
        required: !field.type.optional,
      },
      () => ({
        validator(_rule: RuleObject, value: string) {
          if (!value || field.type.kind !== 'simple') return Promise.resolve();
          let pattern = null;
          switch (field.type.type) {
            case 'int':
              pattern = /^-?[0-9]+(\.[0-9]+)?$/;
              break;
            case 'uint':
              pattern = /^[0-9]+(\.[0-9]+)?$/;
              break;
            case 'bool':
              pattern = /^(true|false)$/;
              break;
            case 'address':
              try {
                Address.parse(value);
              } catch {
                return Promise.reject('Invalid Address');
              }
              break;
            case 'string':
              break;
          }
          if (!pattern) return Promise.resolve();
          const result = pattern.test(value);
          if (!result) {
            return Promise.reject(`Invalid ${field.type.type}`);
          }

          return Promise.resolve();
        },
      }),
    ];
  }
  return rules;
}

function FieldItem(
  fieldType: string,
  files: Tree[],
  placeholder: string,
  defaultValue?: string | number | undefined,
): JSX.Element {
  const renderFilesForCell = () => {
    return files
      .filter(
        (f) =>
          f.name.includes('.ts') &&
          !f.path.startsWith('dist') &&
          !f.path.endsWith('.spec.ts'),
      )
      .map((file) => (
        <Select.Option
          key={`${file.id}-${file.name}`}
          value={file.path}
          title={file.path}
        >
          {file.name}
        </Select.Option>
      ));
  };

  switch (fieldType) {
    case 'bool':
      return <Switch />;
    case 'cell':
    case 'slice':
      return (
        <Select placeholder="Select a TS file" allowClear>
          {renderFilesForCell()}
        </Select>
      );
    case 'any':
      return (
        <Input.TextArea className={s.sliceInput} placeholder={placeholder} />
      );
    default:
      return (
        <Input
          placeholder={placeholder}
          type={defaultValue ? 'hidden' : 'text'}
        />
      );
  }
}

export const renderField = (
  field: TactABIField,
  files: Tree[],
  prefix: string[] = [],
  level = 0,
) => {
  const name = [...prefix, field.name];

  const fieldKind = field.type.kind;
  const isSwitch = fieldKind === 'simple' && field.type.type === 'bool';

  let inputFieldType = 'dict';
  if (field.type.kind === 'simple') {
    inputFieldType = field.type.type;
    if (field.type.format) {
      inputFieldType += ` : ${field.type.format}`;
    }
  }
  const itemStyle = {
    marginLeft: `${level * 5}px`,
    paddingLeft: '2px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const formListForDict = () => (
    <Form.List name={[...name, 'value']} initialValue={[]}>
      {(fieldCollection, { add, remove, move }) => (
        <div className={s.fieldList}>
          <h3 className={s.structName}>{field.name}</h3>
          {fieldCollection.map(({ key, name: fieldName }, index) => {
            return (
              <div key={key} className={s.dictItem}>
                {field.fields?.map((subField, _i) => (
                  <Fragment key={`${key}-${_i}-${subField.name}`}>
                    {renderField(
                      subField as TactABIField,
                      files,
                      [fieldName.toString(), _i === 0 ? '0' : '1'],
                      level + 1,
                    )}
                  </Fragment>
                ))}
                <div className={s.actions}>
                  <Button
                    type="text"
                    onClick={() => {
                      move(index, index - 1);
                    }}
                    disabled={index === 0}
                    icon={<AppIcon name="AngleUp" />}
                  />
                  <Button
                    type="text"
                    onClick={() => {
                      move(index, index + 1);
                    }}
                    disabled={index === fieldCollection.length - 1}
                    icon={<AppIcon name="AngleDown" />}
                  />
                  <Button
                    type="text"
                    danger
                    icon={
                      <MinusCircleOutlined className="dynamic-delete-button" />
                    }
                    onClick={() => {
                      remove(index);
                    }}
                  />
                </div>
              </div>
            );
          })}
          <Button
            className={s.addMoreField}
            type="dashed"
            onClick={() => {
              add();
            }}
          >
            + {field.name}
          </Button>
        </div>
      )}
    </Form.List>
  );

  if (fieldKind === 'dict' && field.fields) {
    return formListForDict();
  } else if (fieldKind === 'simple' && Array.isArray(field.fields)) {
    return (
      <div key={name.join('.')} style={level > 0 ? itemStyle : {}}>
        {level >= 0 && <h3 className={s.structName}>{field.name}</h3>}
        {field.fields.map((subField) => (
          <Fragment key={subField.name}>
            {renderField(
              subField as TactABIField,
              files,
              [...prefix, field.name],
              level + 1,
            )}
          </Fragment>
        ))}
        <Form.Item
          name={[...name, '$$type']}
          initialValue={field.type.type}
          noStyle
        >
          <Input type="hidden" />
        </Form.Item>
      </div>
    );
  }

  const getInitialValue = () => {
    if (isSwitch) return false;
    if (field.type.defaultValue !== undefined) {
      return field.type.defaultValue;
    }
    return null;
  };

  const additionalFieldNotes = () => {
    if (!(fieldKind === 'simple' && field.type.type === 'cell')) {
      return null;
    }

    const popoverContent = () => (
      <div>
        <p>Note: Create a TypeScript file and use the default export.</p>

        <p>
          <i>Example:</i>
        </p>
        <pre>
          {`import { beginCell } from "@ton/core";

const cell = beginCell().storeInt(9, 32).endCell();

export default cell;`}
        </pre>
        <p style={{ color: `var(--color-warning)` }}>
          <b>Supported npm packages:</b> @ton/core, @ton/crypto
        </p>
      </div>
    );

    return (
      <div className={s.notes}>
        <Popover content={popoverContent()}>
          <a>Need help?</a>
        </Popover>
      </div>
    );
  };

  const comptimeSliceInfo = (type: keyof typeof comptimeSliceDescriptions) => {
    return (
      <>
        {comptimeSliceDescriptions[type]}{' '}
        <a
          href={`https://docs.tact-lang.org/ref/core-comptime/#${type}`}
          target="_blank"
          rel="noreferrer"
        >
          Learn more
        </a>
      </>
    );
  };

  return (
    <>
      {fieldKind === 'simple' && field.type.type === 'any' && (
        <Form.Item
          key={`${name.join('.')}-prefix`}
          name={[...name, 'sliceType']}
          rules={[{ required: true, message: 'Please select slice type' }]}
          className={s.formItemABI}
          initialValue="slice"
        >
          <Radio.Group>
            {(['slice', 'rawSlice'] as const).map((type) => (
              <Tooltip key={type} title={comptimeSliceInfo(type)}>
                <Radio value={type}>{type}</Radio>
              </Tooltip>
            ))}
          </Radio.Group>
        </Form.Item>
      )}

      <Form.Item
        key={name.join('.')}
        label={field.name}
        className={s.formItemABI}
        name={[...name, 'value']}
        initialValue={getInitialValue()}
        noStyle={field.type.defaultValue !== undefined}
        extra={additionalFieldNotes()}
        {...(fieldKind === 'simple' && field.type.type === 'bool'
          ? { valuePropName: 'checked' }
          : {})}
        rules={getValidtionRule(field)}
      >
        {FieldItem(
          fieldKind === 'simple' ? field.type.type : 'unknown',
          files,
          inputFieldType,
          field.type.defaultValue,
        )}
      </Form.Item>
      <Form.Item
        key={`${name.join('.')}-type`}
        name={[...name, 'type']}
        initialValue={fieldKind === 'simple' ? field.type.type : 'dict'}
        noStyle
      >
        <Input type="hidden" />
      </Form.Item>
    </>
  );
};

type TactABI = Omit<ABIUiProps, 'abi'> & {
  abiType: TactType;
};

const TactABIUi: FC<TactABI> = ({
  abiType,
  contractAddress,
  network,
  contract = null,
  type,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { callGetter, callSetter } = useContractAction();
  const { createLog } = useLogActivity();
  const [form] = useForm();
  const {
    projectFiles,
    readdirTree,
    activeProject,
    getABIInputValues,
    updateABIInputValues,
  } = useProject();

  const getItemHeading = (item: TactType) => {
    if (item.type?.kind === 'simple') {
      if (item.type.type === 'text' && item.name !== 'String') {
        return `"${item.name}"`;
      }
    }
    return item.name;
  };

  const hasFormErrors = () => {
    if (type === 'Getter' && abiType.params.length === 0) return false;
    if (
      type === 'Setter' &&
      (!abiType.params[0].fields || abiType.params[0].fields.length === 0)
    )
      return false;

    return (
      !form.isFieldsTouched() ||
      form.getFieldsError().some(({ errors }) => errors.length > 0)
    );
  };

  const onSubmit = async (formValues: TactInputFields, fieldName: string) => {
    try {
      const tsProjectFiles: Record<string, string> = {};
      if (isIncludesTypeCellOrSlice(formValues)) {
        const fileCollection = await readdirTree(
          `/${activeProject?.path}`,
          {
            basePath: null,
            content: true,
          },
          (file) =>
            !file.path.startsWith('dist') &&
            file.name.endsWith('.ts') &&
            !file.name.endsWith('.spec.ts'),
        );
        fileCollection.forEach((file) => {
          tsProjectFiles[file.path!] = file.content ?? '';
        });
      }
      const parsedInputsValues = Object.values(
        await parseInputs(formValues, tsProjectFiles),
      );
      setLoading(fieldName);
      const callableFunction = type === 'Getter' ? callGetter : callSetter;

      const response = await callableFunction(
        contractAddress,
        fieldName,
        contract as SandboxContract<UserContract>,
        'tact',
        abiType.receiverType,
        parsedInputsValues as TupleItem[],
        network,
      );

      if (Array.isArray(response)) {
        createLog(JSON.stringify(response, null, 2));
      } else if (response?.logs) {
        if (response.logs.length === 0 && response.message) {
          createLog(response.message);
        } else {
          for (const log of response.logs) {
            createLog(
              log,
              response.status ? (response.status as LogType) : 'info',
            );
          }
        }
      } else {
        createLog(JSON.stringify(response, null, 2));
      }
      updateABIInputValues({
        key: abiType.name,
        value: formValues,
        type: type,
      });
    } catch (error) {
      if ((error as Error).message.includes('no healthy nodes for')) {
        createLog(
          'No healthy nodes for this network. Redeploy your contract.',
          'error',
        );
        return;
      }
      if (error instanceof Error) {
        const match = error.message.match(EXIT_CODE_PATTERN);
        if (match) {
          const code = match[1];
          const contractError = (contract as Contract).abi?.errors?.[+code];
          // If it's a custom error code
          if (contractError && !ExitCodes[code]) {
            const modifiedLog = error.message.replace(
              EXIT_CODE_PATTERN,
              `exit_code: ${code} (${contractError.message})`,
            );
            createLog(modifiedLog, 'error');
            return;
          }
        }
        createLog(error.message, 'error');
        return;
      }
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (!activeProject) return;
    const abiFields = getABIInputValues(abiType.name, type);
    if (!abiFields) return;
    form.setFieldsValue(abiFields);
  }, []);

  return (
    <div className={`${s.root} ${s.tact} ${s[type]}`}>
      <Form
        key={abiType.name}
        form={form}
        className={`${s.form} ${s.nestedForm} app-form`}
        layout="vertical"
        onFinish={(values) => {
          onSubmit(values, abiType.name);
        }}
      >
        <h4 className={s.abiHeading}>{getItemHeading(abiType)}:</h4>
        {abiType.params.map((field) => (
          <Fragment key={field.name}>
            {renderField(
              field as TactABIField,
              projectFiles,
              [],
              type === 'Setter' ? -1 : 0,
            )}
          </Fragment>
        ))}
        <Form.Item shouldUpdate noStyle>
          {() => (
            <Button
              className={`${s.btnAction} bordered-gradient`}
              type="default"
              htmlType="submit"
              disabled={hasFormErrors()}
              loading={loading === abiType.name}
            >
              {type === 'Getter' ? 'Call' : 'Send'}
            </Button>
          )}
        </Form.Item>
      </Form>
    </div>
  );
};

export default TactABIUi;
