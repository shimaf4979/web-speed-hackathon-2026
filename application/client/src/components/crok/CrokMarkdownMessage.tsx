import { lazy, memo, Suspense, useEffect, useState } from "react";

import Markdown from "react-markdown";

interface Props {
  content: string;
}

const CrokCodeMarkdownMessage = lazy(async () =>
  import("@web-speed-hackathon-2026/client/src/components/crok/CrokCodeMarkdownMessage").then(
    (module) => ({
      default: module.CrokCodeMarkdownMessage,
    }),
  ),
);
const CrokGfmMarkdownMessage = lazy(async () =>
  import("@web-speed-hackathon-2026/client/src/components/crok/CrokGfmMarkdownMessage").then(
    (module) => ({
      default: module.CrokGfmMarkdownMessage,
    }),
  ),
);
const CrokGfmCodeMarkdownMessage = lazy(async () =>
  import("@web-speed-hackathon-2026/client/src/components/crok/CrokGfmCodeMarkdownMessage").then(
    (module) => ({
      default: module.CrokGfmCodeMarkdownMessage,
    }),
  ),
);
const CrokRichMarkdownMessage = lazy(async () =>
  import("@web-speed-hackathon-2026/client/src/components/crok/CrokRichMarkdownMessage").then(
    (module) => ({
      default: module.CrokRichMarkdownMessage,
    }),
  ),
);

const RICH_MARKDOWN_DELAY_MS = 750;

function hasMathMarkdown(content: string) {
  return /\$[^$\n]+\$|\$\$[\s\S]+?\$\$/.test(content);
}

function hasCodeMarkdown(content: string) {
  return /```/.test(content);
}

function hasGfmMarkdown(content: string) {
  return /~~[^~]+~~/.test(content) || /^\|.+\|\s*$/m.test(content);
}

function getRenderMode(content: string) {
  const needsMathMarkdown = hasMathMarkdown(content);
  const needsCodeMarkdown = hasCodeMarkdown(content);
  const needsGfmMarkdown = hasGfmMarkdown(content);

  if (needsMathMarkdown) {
    return "rich";
  }

  if (needsCodeMarkdown && needsGfmMarkdown) {
    return "gfm-code";
  }

  if (needsCodeMarkdown) {
    return "code";
  }

  if (needsGfmMarkdown) {
    return "gfm";
  }

  return "basic";
}

const BasicMarkdownMessage = memo(({ content }: Props) => <Markdown>{content}</Markdown>);

export const CrokMarkdownMessage = memo(({ content }: Props) => {
  const [shouldRenderRich, setShouldRenderRich] = useState(false);
  const renderMode = getRenderMode(content);
  const needsRichMarkdown = renderMode !== "basic";

  useEffect(() => {
    setShouldRenderRich(false);

    if (!needsRichMarkdown) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderRich(true);
    }, RICH_MARKDOWN_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [content, needsRichMarkdown]);

  if (!needsRichMarkdown || !shouldRenderRich) {
    return <BasicMarkdownMessage content={content} />;
  }

  const RichMarkdownMessage =
    renderMode === "code"
      ? CrokCodeMarkdownMessage
      : renderMode === "gfm"
        ? CrokGfmMarkdownMessage
        : renderMode === "gfm-code"
          ? CrokGfmCodeMarkdownMessage
          : CrokRichMarkdownMessage;

  return (
    <Suspense fallback={<BasicMarkdownMessage content={content} />}>
      <RichMarkdownMessage content={content} />
    </Suspense>
  );
});
