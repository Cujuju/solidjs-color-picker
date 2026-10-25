/** A text field over a value it doesn't own: shows the value's text unless a draft is pending; commit drops the draft. */

import { createSignal } from 'solid-js';

export interface DraftFieldOptions<T> {
  /** Text for the current value. */
  format: () => string;
  /** The value typed, or null when the text is not one. */
  parse: (text: string) => T | null;
  apply: (value: T) => void;
  /** Apply each valid keystroke as typed, not only on commit. */
  live?: boolean;
}

export function createDraftField<T>(opts: DraftFieldOptions<T>) {
  const [draft, setDraft] = createSignal<string | null>(null);
  const applyText = (text: string) => {
    const value = opts.parse(text);
    if (value !== null) opts.apply(value);
  };
  return {
    text: () => draft() ?? opts.format(),
    input: (text: string) => {
      setDraft(text);
      if (opts.live) applyText(text);
    },
    /** Blur or Enter: apply the draft if valid, then show the value's own text again. */
    commit: () => {
      const text = draft();
      setDraft(null);
      if (text !== null) applyText(text);
    },
  };
}
