import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "@web-speed-hackathon-2026/client/src/components/crok/CodeBlock";

interface Props {
  content: string;
}

export const CrokGfmCodeMarkdownMessage = ({ content }: Props) => {
  return (
    <Markdown components={{ pre: CodeBlock }} remarkPlugins={[remarkGfm]}>
      {content}
    </Markdown>
  );
};
