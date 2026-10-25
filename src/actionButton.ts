/** Style shared by the picker's action buttons (Cancel, Ok, Add). */

import type { JSX } from 'solid-js';
import type { PickerTokens } from './types';

/** Height (px) of action buttons, and of the controls that share their row. */
export const ACTION_BUTTON_H = 26;

/** Action button style; `primary` fills with the accent. Text alignment, font family and line height are set explicitly. */
export function actionButtonStyle(P: PickerTokens, primary: boolean): JSX.CSSProperties {
  return {
    flex: '1', height: `${ACTION_BUTTON_H}px`, padding: '0', cursor: 'pointer',
    "border-radius": `${P.radiusSm}px`, "font-size": `${P.fontSizeSm}px`,
    "text-align": 'center', "font-family": 'inherit', "line-height": '1',
    ...(primary
      ? { background: P.accent, border: 'none', color: P.textOnAccent, "font-weight": '600' }
      : { background: P.bgInput, border: `1px solid ${P.border}`, color: P.textMuted }),
  };
}
