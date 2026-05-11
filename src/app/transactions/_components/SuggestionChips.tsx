"use client";

interface TitleChipsProps {
  suggestions: Array<{ title: string; category: string }>;
  onSelect: (title: string, category: string) => void;
}

export function TitleSuggestionChips({ suggestions, onSelect }: TitleChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {suggestions.map((s) => (
        <button
          key={`title-${s.title}`}
          type="button"
          onClick={() => onSelect(s.title, s.category)}
          className="px-2.5 py-1 rounded-[6px] text-[10px] font-medium active:opacity-70 transition-opacity"
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
    <div className="flex flex-wrap gap-1.5 mt-2">
      {suggestions.map((cat) => (
        <button
          key={`cat-${cat}`}
          type="button"
          onClick={() => onSelect(cat)}
          className="px-2.5 py-1 rounded-[6px] text-[10px] font-medium active:opacity-70 transition-opacity"
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
