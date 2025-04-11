import AppIcon from '@/components/ui/icon';
import { Button, Skeleton } from 'antd';
import React, { useEffect, useState } from 'react';
import { createHighlighter } from 'shiki';
import s from './CodeBlock.module.scss';

interface CodeBlockProps {
  code: string;
  lang?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, lang = 'typescript' }) => {
  const [html, setHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  useEffect(() => {
    const loadHighlighter = async () => {
      const highlighter = await createHighlighter({
        themes: ['min-dark', 'min-light'],
        langs: [lang],
      });
      const html = highlighter.codeToHtml(code, {
        lang: lang,
        themes: {
          light: 'min-light',
          dark: 'min-dark',
        },
        colorReplacements: {
          '#1f1f1f': '#0e0e10',
          '#ffffff': '#e8e8e8',
        },
      });
      setHtml(html);
      setIsLoading(false);
    };

    loadHighlighter();
  }, [code, lang]);

  return (
    <div className={s.root}>
      {isLoading && !html ? (
        <Skeleton active={isLoading} />
      ) : (
        <div
          className="shiki-code"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      <Button size="small" className={s.copy} onClick={handleCopy}>
        {copied ? 'Copied!' : <AppIcon name="Copy" />}
      </Button>
    </div>
  );
};

export default CodeBlock;
