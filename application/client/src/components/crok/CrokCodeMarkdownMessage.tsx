import Markdown from "react-markdown";

import { CodeBlock } from "@web-speed-hackathon-2026/client/src/components/crok/CodeBlock";

interface Props {
  content: string;
}

export const CrokCodeMarkdownMessage = ({ content }: Props) => {
  return (
    <Markdown components={{ pre: CodeBlock }}>
      {content}
    </Markdown>
  );
};
