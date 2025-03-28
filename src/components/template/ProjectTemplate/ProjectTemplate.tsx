/* eslint-disable react/no-children-prop */
import { NewProject } from '@/components/project';
import { Link } from '@/components/shared';
import AppIcon from '@/components/ui/icon';
import { AppConfig } from '@/config/AppConfig';
import { projectExamples } from '@/constant/projectExamples';
import { App, Drawer, Skeleton } from 'antd';
import axios from 'axios';
import { FC, memo, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { createHighlighter } from 'shiki';
import tactTMLanguage from '../../../assets/ton/tact/tmLanguage.json';
import s from './ProjectTemplate.module.scss';

async function highlightCode(code: string) {
  const highlighter = await createHighlighter({
    themes: ['min-dark', 'min-light'],
    langs: [tactTMLanguage, 'typescript'],
  });

  return highlighter.codeToHtml(code, {
    lang: 'tact',
    themes: {
      light: 'min-light',
      dark: 'min-dark',
    },
    colorReplacements: {
      '#1f1f1f': '#0e0e10',
      '#ffffff': '#e8e8e8',
    },
  });
}

interface CodeBlockProps {
  children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ children }) => {
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  useEffect(() => {
    async function highlight() {
      const html = await highlightCode((children as string).trim());
      setHighlightedCode(html);
    }
    highlight();
  }, [children]);

  if (!highlightedCode) {
    return <pre className={s.codeLoading}>Loading code...</pre>;
  }

  return <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
};

function LinkRenderer({
  href,
  children,
}: React.DetailedHTMLProps<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

const ProjectTemplate: FC = () => {
  const [currentExample, setCurrentExample] = useState(-1);
  const examples = projectExamples.examples;
  const [loading, setLoading] = useState<string>('');
  const contractBlank = { contract: '', content: '' };
  const [contractDetails, setContractDetails] = useState<{
    contract: string;
    content: string;
  }>({ contract: '', content: '' });
  const { message } = App.useApp();

  const getContent = async () => {
    const link = examples[currentExample].link;
    const contractURL = `${AppConfig.proxy.url}${
      projectExamples.baseURL + link + '/contract.tact'
    }`;
    const contentURL = `${AppConfig.proxy.url}${
      projectExamples.baseURL + link + '/content.md'
    }`;
    setContractDetails(contractBlank);
    try {
      setLoading('content');
      const axiosParams = {
        headers: {
          'x-cors-api-key': AppConfig.proxy.key,
        },
      };
      const contractResponse = await axios.get(contractURL, axiosParams);
      const contentResponse = await axios.get(contentURL, axiosParams);

      const content =
        '```tact\n' + contractResponse.data + '\n```\n' + contentResponse.data;

      setContractDetails({
        contract: contractResponse.data,
        content: content,
      });
    } catch (error) {
      await message.error('Unable to get content');
    } finally {
      setLoading('');
    }
  };

  const goToTemplate = (templateIndex: number) => {
    if (!isExists(templateIndex)) {
      return;
    }
    setCurrentExample(templateIndex);
  };

  const isExists = (templateIndex: number) => {
    if (templateIndex === -1) {
      return false;
    }
    return examples[templateIndex];
  };

  const closeTemplate = () => {
    setCurrentExample(-1);
  };

  useEffect(() => {
    if (!isExists(currentExample)) {
      return;
    }
    getContent().catch(() => {});
  }, [currentExample]);

  return (
    <div className={s.root}>
      <h2>Tact Templates:</h2>
      <div className={s.examples}>
        {examples.map((example, i) => (
          <div
            className={s.item}
            key={example.link}
            onClick={() => {
              goToTemplate(i);
            }}
          >
            {example.name}
          </div>
        ))}
      </div>
      <div className={s.credit}>
        Credits for the examples go to the{' '}
        <Link to="https://github.com/talkol" target="_blank">
          Tal Kol
        </Link>
        {' for '}
        <Link to="https://tact-by-example.org/all" target="_blank">
          Tact by example
        </Link>
      </div>

      <Drawer
        rootClassName={s.projectExampleDrawer}
        title={examples[currentExample]?.name}
        placement="right"
        width={500}
        onClose={closeTemplate}
        open={currentExample > -1}
        closeIcon={<AppIcon name="Close" />}
        extra={
          contractDetails.content && (
            <NewProject
              projectType="exampleTemplate"
              heading="Import contract in IDE"
              label="Use in IDE"
              icon="Import"
              ui="button"
              projectLanguage="tact"
              name={examples[currentExample]?.name}
              defaultFiles={[
                {
                  id: '1',
                  name: `main.tact`,
                  parent: null,
                  type: 'file' as const,
                  path: `main.tact`,
                  content: contractDetails.contract,
                },
              ]}
            />
          )
        }
      >
        {loading === 'content' && <Skeleton active />}
        <Markdown
          children={contractDetails.content}
          components={{
            code: (props) => {
              const { children, className } = props;
              const match = /language-(\w+)/.exec(className ?? '');

              return match ? (
                <CodeBlock {...props} />
              ) : (
                <span className={className}>{children}</span>
              );
            },
            a: LinkRenderer,
          }}
        />
      </Drawer>
    </div>
  );
};

export default memo(ProjectTemplate);
