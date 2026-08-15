import type React from 'react';
import { maskEmailAddresses } from '@/lib/privacy/maskEmailAddresses';

const MENTION_PATTERN = /(^|\s)(@(?:all|[\p{L}\p{N}_][\p{L}\p{N}_.-]{0,63}))/giu;

export function renderMentionText(value: string): React.ReactNode[] {
  const safeValue = maskEmailAddresses(value);
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of safeValue.matchAll(MENTION_PATTERN)) {
    const prefix = match[1] ?? '';
    const mention = match[2] ?? '';
    const mentionStart = (match.index ?? 0) + prefix.length;

    if (mentionStart > lastIndex) {
      nodes.push(safeValue.slice(lastIndex, mentionStart));
    }

    nodes.push(
      <span key={`${mentionStart}-${mention}`} className="font-semibold text-sky-600">
        {mention}
      </span>,
    );
    lastIndex = mentionStart + mention.length;
  }

  if (lastIndex < safeValue.length) {
    nodes.push(safeValue.slice(lastIndex));
  }

  return nodes.length ? nodes : [safeValue];
}

type MentionTextProps = {
  value: string;
};

export function MentionText({ value }: MentionTextProps) {
  return <>{renderMentionText(value)}</>;
}
