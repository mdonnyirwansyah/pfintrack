"use client";

interface TitleChipsProps {
  suggestions: Array<{ title: string; category: string }>;
  onSelect: (title: string, category: string) => void;
}

export function TitleSuggestionChips({ suggestions, onSelect }: TitleChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(s.title, s.category)}
          className="px-3 py-1.5 min-h-[44px] rounded-full text-[12px] font-medium active:opacity-70 transition-opacity"
          style={{
            background: "var(--color-brand-soft)",
            color: "var(--color-brand)",
            border: "1px solid var(--color-brand)",
          }}
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}

interface CategoryChipsProps {
  suggestions: string[];
  onSelect: (category: string) => void;
}

export function CategorySuggestionChips({ suggestions, onSelect }: CategoryChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((cat, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(cat)}
          className="px-3 py-1.5 min-h-[44px] rounded-full text-[12px] font-medium active:opacity-70 transition-opacity"
          style={{
            background: "var(--color-brand-soft)",
            color: "var(--color-brand)",
            border: "1px solid var(--color-brand)",
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
