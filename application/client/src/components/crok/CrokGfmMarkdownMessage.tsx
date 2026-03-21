import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export const CrokGfmMarkdownMessage = ({ content }: Props) => {
  return (
    <Markdown remarkPlugins={[remarkGfm]}>
      {content}
    </Markdown>
  );
};
