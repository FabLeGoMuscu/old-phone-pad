/**
 * OldPhonePad Service
 *
 * Converts an old T9-style phone keypad input string into the resulting text.
 *
 * Key mappings (standard 3×4 keypad layout):
 *
 *   ┌───────┬───────┬───────┐
 *   │   1   │ 2 ABC │ 3 DEF │
 *   ├───────┼───────┼───────┤
 *   │ 4 GHI │ 5 JKL │ 6 MNO │
 *   ├───────┼───────┼───────┤
 *   │ 7PQRS │ 8 TUV │ 9WXYZ │
 *   ├───────┼───────┼───────┤
 *   │   *   │ 0 SPC │   #   │
 *   └───────┴───────┴───────┘
 *
 * Input rules:
 *   - Consecutive presses of the same key cycle through its letters.
 *     e.g. "2" → A, "22" → B, "222" → C, "2222" → A (wraps around)
 *   - A space in the input separates presses of the same key into distinct
 *     characters: "222 2 22" → "CAB"
 *   - '*' deletes the last committed character (backspace).
 *   - '#' signals end-of-input (send button) and terminates processing.
 *   - Key '1' has no letter mappings and is ignored.
 *
 * @example
 * OldPhonePadService.OldPhonePad('33#')                 // → 'E'
 * OldPhonePadService.OldPhonePad('227*#')               // → 'B'
 * OldPhonePadService.OldPhonePad('4433555 555666#')     // → 'HELLO'
 * OldPhonePadService.OldPhonePad('8 88777444666*664#')  // → 'TURING'
 */
export class OldPhonePadService {
  /**
   * Mapping from keypad digit to the letters it cycles through.
   * Pressing a key n times selects letters[(n - 1) % letters.length].
   */
  static readonly KEYPAD_MAP: Readonly<Record<string, string>> = {
    '2': 'ABC',
    '3': 'DEF',
    '4': 'GHI',
    '5': 'JKL',
    '6': 'MNO',
    '7': 'PQRS',
    '8': 'TUV',
    '9': 'WXYZ',
    '0': ' ',
  };

  /**
   * Converts an old-phone-pad input sequence into the corresponding text.
   *
   * The algorithm maintains the *currently active key* and a *press counter*.
   * When the active key changes (or a space / '*' / '#' is seen), the
   * accumulated presses are resolved to a single character and appended
   * to the result.
   *
   *
   * @param input - The raw key sequence, must end with '#'.
   * @returns The decoded text string.
   */
  static OldPhonePad(input: string): string {
    let result = '';
    let currentKey = '';
    let pressCount = 0;

    if(input.length > 500) {
      throw new Error('Input exceeds maximum length of 500 characters.');
    }

    /** Resolves the current key + press count into a character and resets state. */
    const commitCurrent = (): void => {
      if (currentKey && pressCount > 0) {
        const letters = OldPhonePadService.KEYPAD_MAP[currentKey];
        if (letters !== undefined) {
          result += letters[(pressCount - 1) % letters.length];
        }
        currentKey = '';
        pressCount = 0;
      }
    };

    for (const char of input) {
      if (char === '#') {
        // Send — commit whatever is pending and stop
        commitCurrent();
        break;
      }

      if (char === '*') {
        // Backspace — commit pending char (if any) then delete the last output char
        commitCurrent();
        if (result.length > 0) {
          result = result.slice(0, -1);
        }
        continue;
      }

      if (char === ' ') {
        // Pause — commit the current character so the next press starts fresh
        commitCurrent();
        continue;
      }

      if (char in OldPhonePadService.KEYPAD_MAP) {
        // A different digit key was pressed — commit the previous run first
        if (currentKey !== '' && char !== currentKey) {
          commitCurrent();
        }
        currentKey = char;
        pressCount++;
      }
      // Characters not in the keypad map (e.g. '1') are silently ignored
    }

    return result;
  }
}
