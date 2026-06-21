import type React from 'react';

const MENTION_PATTERN = /(^|\s)(@(?:all|[\p{L}\p{N}_][\p{L}\p{N}_.-]{0,63}))/giu;

export function renderMentionText(value: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(MENTION_PATTERN)) {
    const prefix = match[1] ?? '';
    const mention = match[2] ?? '';
    const mentionStart = (match.index ?? 0) + prefix.length;

    if (mentionStart > lastIndex) {
      nodes.push(value.slice(lastIndex, mentionStart));
    }

    nodes.push(
      <span key={`${mentionStart}-${mention}`} className="font-semibold text-sky-600">
        {mention}
      </span>,
    );
    lastIndex = mentionStart + mention.length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes.length ? nodes : [value];
}

type MentionTextProps = {
  value: string;
};

export function MentionText({ value }: MentionTextProps) {
  return <>{renderMentionText(value)}</>;
}
