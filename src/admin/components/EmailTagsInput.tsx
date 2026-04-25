import { useState, KeyboardEvent } from 'react';
import { X, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailTagsInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
}

/**
 * Tag-style multi-email input. Press Enter or comma to commit.
 */
export function EmailTagsInput({ value, onChange, placeholder = 'Add email and press Enter' }: EmailTagsInputProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const commit = (raw: string) => {
    const e = raw.trim().replace(/,$/, '').toLowerCase();
    if (!e) return;
    if (!EMAIL_RE.test(e)) { setError(`"${e}" is not a valid email`); return; }
    if (value.includes(e)) { setDraft(''); return; }
    onChange([...value, e]);
    setDraft('');
    setError('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (draft.trim()) { e.preventDefault(); commit(draft); }
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const remove = (em: string) => onChange(value.filter((x) => x !== em));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background focus-within:ring-2 focus-within:ring-ring">
        {value.map((em) => (
          <Badge key={em} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
            <Mail className="h-3 w-3" />
            <span className="text-xs">{em}</span>
            <button type="button" onClick={() => remove(em)} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          className="flex-1 min-w-[180px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          value={draft}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(e) => { setDraft(e.target.value); setError(''); }}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <p className="text-xs text-muted-foreground mt-1">Separate multiple emails with comma or Enter.</p>
    </div>
  );
}
