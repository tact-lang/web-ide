import {
  ContractLanguage,
  TactABIField,
  TactInputFields,
} from '@/interfaces/workspace.interface';
import { CompilerContext } from '@tact-lang/compiler/dist/context';
import { getType } from '@tact-lang/compiler/dist/types/resolveDescriptors';

import {
  ABIArgument,
  ABIField,
  ABIType,
  Address,
  ContractABI,
  Dictionary,
  DictionaryKeyTypes,
} from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';
import { OutputChunk, RenderedChunk } from 'rollup';
import { buildTs } from './typescriptHelper';

export type ABITypeObject = Record<string, ABIType>;

interface TactContractABI extends ContractABI {
  init: Maybe<ABIArgument[]>;
}

export class ABIParser {
  private language: ContractLanguage;
  private abi: TactContractABI;
  private abiTypes: Maybe<ABITypeObject>;

  constructor(abi: TactContractABI, language: ContractLanguage = 'tact') {
    this.language = language;
    this.abi = abi;
    this.abiTypes = this.generateAbiTypes();
  }

  get init() {
    if (!this.abi.init) {
      return undefined;
    }
    return this.abi.init.map((item) => {
      const dataType = item.type.kind === 'simple' ? item.type.type : 'dict';
      if (
        this.abiTypes &&
        !Object.prototype.hasOwnProperty.call(this.abiTypes, dataType) &&
        item.type.kind === 'simple'
      ) {
        item.type.type = item.type.type.toLowerCase();
      }
      return {
        name: item.name,
        type: item.type,
        fields: this.resolveFields(item),
      };
    });
  }

  get getters() {
    if (!this.abi.getters) {
      return undefined;
    }

    return this.abi.getters.map((getter) => {
      let getterArguments: TactABIField[] = [];
      if (getter.arguments) {
        getterArguments = getter.arguments.map((argument) => {
          return {
            name: argument.name,
            type: argument.type,
            fields: this.resolveFields(argument),
          };
        });
      }
      return {
        name: getter.name,
        params: getterArguments,
        returnType: getter.returnType,
      };
    });
  }

  get receivers() {
    if (!this.abi.receivers) {
      return undefined;
    }

    return (
      this.abi.receivers
        // TODO: handle fallback. i.e. kind === 'any'
        .filter(
          (item) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (item.message as any).type !== 'Deploy' &&
            item.message.kind !== 'any',
        )
        .map((receiver) => {
          let argumentName: string;

          switch (receiver.message.kind) {
            case 'typed':
              argumentName = receiver.message.type;
              break;
            case 'text':
              argumentName = receiver.message.text ?? '';
              break;
            case 'any':
              argumentName = 'any';
              break;
            case 'empty':
              argumentName = 'empty';
              break;
            default:
              argumentName = 'unknown';
              break;
          }

          if (receiver.message.kind !== 'typed') {
            return {
              name: argumentName,
              receiverType: receiver.receiver,
              type: {
                kind: 'simple',
                type: receiver.message.kind,
              },
              params: [
                {
                  name: argumentName,
                  type: {
                    kind: 'simple',
                    type: receiver.message.kind,
                    defaultValue: argumentName,
                  },
                },
              ],
            };
          }

          return {
            name: argumentName,
            receiverType: receiver.receiver,
            params: [
              {
                name: argumentName,
                type: {
                  kind: 'simple',
                  type: argumentName,
                },
                fields: this.resolveFields({
                  name: argumentName,
                  type: {
                    kind: 'simple',
                    type: receiver.message.type,
                  },
                }),
              },
            ],
          };
        })
    );
  }

  getABI() {
    return this.abi;
  }

  private generateAbiTypes() {
    if (!this.abi.types || this.language === 'func') {
      return undefined;
    }
    return this.abi.types.reduce((acc, type) => {
      acc[type.name] = type;
      return acc;
    }, {} as ABITypeObject);
  }

  private resolveFields(field: ABIField): ABIField[] | null {
    if (!this.abiTypes) {
      return null;
    }
    if (
      field.type.kind === 'simple' &&
      Object.prototype.hasOwnProperty.call(this.abiTypes, field.type.type)
    ) {
      const type = this.abiTypes[field.type.type];

      return type.fields.map((item) => {
        return {
          name: item.name,
          type: item.type,
          fields: this.resolveFields(item),
        };
      }) as ABIField[];
    } else if (field.type.kind === 'dict') {
      const fields: TactABIField[] | null = [];
      fields.push({
        name: field.type.key,
        type: {
          kind: 'simple',
          type: field.type.key,
        },
      } as TactABIField);
      if (
        Object.prototype.hasOwnProperty.call(this.abiTypes, field.type.value)
      ) {
        const _field = this.resolveFields({
          ...field,
          type: { kind: 'simple', type: field.type.value },
        });
        if (_field)
          fields.push({
            name: field.type.value,
            type: { type: field.type.value, kind: 'simple' },
            fields: _field,
          });
      } else {
        fields.push({
          name: field.type.value,
          type: {
            kind: 'simple',
            type: field.type.value,
          },
        } as TactABIField);
      }
      return fields;
    }
    return null;
  }
}

export function getContractInitParams(
  ctx: CompilerContext,
  contractName: string,
) {
  const contactType = getType(ctx, contractName);

  if (!contactType.init?.params) return [];
  return contactType.init.params.map((item) => {
    let additionalProps = {};
    switch (item.type.kind) {
      case 'ref':
        additionalProps = {
          type: item.type.name,
          optional: item.type.optional,
        };
        break;
      case 'map':
        additionalProps = {
          key: item.type.key.toLowerCase(),
          type: undefined,
          value: item.type.value,
          valueFormat: item.type.valueAs,
        };
        break;
      case 'void':
        additionalProps = {
          name: item.name.text,
          type: 'void',
        };
        break;
      case 'null':
        additionalProps = {
          name: item.name.text,
          type: 'null',
        };
        break;
      default:
        additionalProps = {
          name: 'unknown',
          type: 'null',
        };
        break;
    }
    return {
      name: item.name.text,
      type: {
        ...additionalProps,
        kind: item.type.kind === 'map' ? 'dict' : 'simple',
      },
    };
  });
}

export async function parseInputs(
  inputFields: TactInputFields,
  files: Record<string, string>,
  key?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (typeof inputFields === 'object' && !Array.isArray(inputFields)) {
    // Check if both `value` and `type` are present in the current object. If not, then it may be a map or struct.
    if ('value' in inputFields && 'type' in inputFields) {
      const value = inputFields['value'] as
        | string
        | undefined
        | number
        | boolean;
      if (value === undefined) return;
      const valueType = inputFields['type'] as string;

      switch (valueType) {
        case 'int':
        case 'uint':
          try {
            return BigInt(value);
          } catch (error) {
            throw new Error(`Parsing failed for ${key}: ${value}`);
          }
        case 'cell':
        case 'slice':
          return await generateCell(value as string, files);
        case 'address':
          return Address.parse(value as string);
        case 'string':
          return String(value);
        case 'bool':
          return value;
        case 'text':
          return value;
        case 'empty':
          return null;
        default:
          throw new Error(`Unknown type: ${valueType}`);
      }
    } else {
      const parsedObj = {} as TactInputFields;

      // If has `$$type` then it is a struct
      if (
        typeof parsedObj === 'object' &&
        Object.prototype.hasOwnProperty.call(inputFields, '$$type')
      ) {
        parsedObj['$$type'] = inputFields['$$type'];
      } else {
        // If has `value` and value is an array, then it is a map
        if ('value' in inputFields && Array.isArray(inputFields['value'])) {
          const listItem = Dictionary.empty();
          for (const item of inputFields['value'] as unknown[]) {
            const parsedItem = await parseInputs(
              item as TactInputFields,
              files,
            );
            listItem.set(
              Object.values(parsedItem[0])[0] as unknown as DictionaryKeyTypes,
              Object.values(parsedItem[1])[0],
            );
          }
          return listItem;
        }
      }
      for (const key in inputFields as TactInputFields) {
        if (
          Object.prototype.hasOwnProperty.call(inputFields, key) &&
          !key.startsWith('$$')
        ) {
          parsedObj[key] = await parseInputs(inputFields[key], files, key);
        }
      }
      return parsedObj;
    }
  } else {
    return inputFields;
  }
}

async function generateCell(
  rootFilePath: string,
  files: Record<string, string>,
) {
  files['ide__cell.ts'] = `
    import exported__cell from "./${rootFilePath}"; window.exported__cell = exported__cell;`;

  let jsOutout: RenderedChunk[] | string = await buildTs(files, 'ide__cell.ts');

  jsOutout = (jsOutout as OutputChunk[])[0].code
    .replace(/import\s*{/g, 'const {')
    .replace(/}\s*from\s*'@ton\/core';/, '} = window.TonCore;')
    .replace(/}\s*from\s*'ton-core';/, '} = window.TonCore;')
    .replace(/}\s*from\s*'@ton\/crypto';/, '} = window.TonCrypto;');

  const _code = `async function main() {
     ${jsOutout as string}
      return window.exported__cell
    } return main()`;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(_code)();
}
