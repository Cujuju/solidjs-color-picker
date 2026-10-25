/**
 * A text field over a value it does not own. It shows the value's own text until the user types; the draft is dropped
 * on commit, valid or not.
 */

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
