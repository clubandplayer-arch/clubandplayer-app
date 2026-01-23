'use client';

import { useEffect, useMemo, useState } from 'react';
import { EMOJI_CATEGORIES, type EmojiCategory, type EmojiItem } from '@/lib/emoji/emojiData';

const RECENT_STORAGE_KEY = 'cp_recent_emojis';
const RECENT_LIMIT = 20;

type Props = {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
};

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string');
    }
  } catch {
    return [];
  }
  return [];
}

function storeRecent(items: string[]) {
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function matchQuery(item: EmojiItem, query: string) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return item.keywords.some((keyword) => keyword.toLowerCase().includes(normalized));
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('smileys');

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const categories = useMemo(() => {
    const recentCategory: EmojiCategory = {
      id: 'recent',
      name: 'Recenti',
      emojis: recent.map((char) => ({ char, keywords: ['recenti'] })),
    };
    const base = EMOJI_CATEGORIES.filter((category) => category.id !== 'recent');
    if (recentCategory.emojis.length > 0) {
      return [recentCategory, ...base];
    }
    return base;
  }, [recent]);

  const allEmojis = useMemo(() => {
    const items: EmojiItem[] = [];
    categories.forEach((category) => {
      items.push(...category.emojis);
    });
    return items;
  }, [categories]);

  const filtered = useMemo(() => {
    if (!query) return [];
    return allEmojis.filter((item) => matchQuery(item, query));
  }, [allEmojis, query]);

  const activeEmojis = useMemo(() => {
    if (query) return filtered;
    const category = categories.find((item) => item.id === activeCategory) ?? categories[0];
    return category?.emojis ?? [];
  }, [categories, activeCategory, filtered, query]);

  const handleSelect = (emoji: string) => {
    const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, RECENT_LIMIT);
    setRecent(next);
    storeRecent(next);
    onSelect(emoji);
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca emoji"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
        <button
          type="button"
          className="text-xs font-semibold text-neutral-500"
          onClick={() => {
            setQuery('');
            onClose?.();
          }}
        >
          Chiudi
        </button>
      </div>

      {query ? (
        <div className="mt-3 text-xs text-neutral-500">Risultati ({filtered.length})</div>
      ) : (
        <div className="mt-3 flex gap-1 overflow-x-auto pb-2 text-xs font-semibold text-neutral-500">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`whitespace-nowrap rounded-full border px-3 py-1 ${
                activeCategory === category.id
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-neutral-200 text-neutral-500'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex-1 overflow-y-auto pr-1">
        {activeEmojis.length === 0 ? (
          <div className="text-sm text-neutral-500">Nessuna emoji trovata</div>
        ) : (
          <div className="grid grid-cols-8 gap-2 text-lg sm:grid-cols-9">
            {activeEmojis.map((emoji) => (
              <button
                key={`${emoji.char}-${emoji.keywords.join('-')}`}
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-neutral-100"
                onClick={() => handleSelect(emoji.char)}
              >
                {emoji.char}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
