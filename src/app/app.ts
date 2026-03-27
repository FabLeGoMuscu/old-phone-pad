// =============================================================================
//  app.ts  —  Root Angular component
//  Author: Fabrizio
//
//  This is the single component that drives the whole UI.  I kept everything
//  in one component deliberately — the app is small enough that splitting it
//  into sub-components would add file-hopping overhead without any real gain.
//
//  ANGULAR SIGNALS (used throughout this file)
//  ============================================
//  Angular 21 uses a reactive primitive called a "signal" instead of the older
//  RxJS-heavy approach.  Think of a signal as a smart variable:
//
//    const count = signal(0);    // create — wraps initial value 0
//    count()                     // read   — call it like a function
//    count.set(5)                // write  — replaces the value
//    count.update(n => n + 1)    // update — derives new value from old
//
//  A `computed()` is a read-only signal whose value is automatically
//  recalculated whenever any signal it reads changes.  Angular's change
//  detection only re-renders the parts of the DOM that read a changed signal.
//  Zero manual subscriptions, zero memory leaks.
//
//  I only used signals where the value changes over time and the template
//  needs to react to it.  Static data (keypadButtons, conversionRows, etc.)
//  is just a plain readonly class property — no signal needed.
// =============================================================================

import { Component, computed, signal, OnDestroy } from '@angular/core';
import { OldPhonePadService } from './old-phone-pad.service';

// =============================================================================
//  INTERFACES
//  I define these here rather than in a separate file since they are only used
//  by this component.  Keeping them co-located makes the file self-contained.
// =============================================================================

/**
 * Represents one row in the Test Cases panel.
 *
 * `input` and `expected` are fixed at creation time and never change.
 * `result` and `passed` are populated when the user clicks "Run All Tests"
 * and are `undefined` until that happens — which is why the template uses
 * `tc.result !== undefined` before trying to show a badge.
 */
interface TestCase {
  input: string;      // the raw key sequence fed to OldPhonePad()
  expected: string;   // the text we expect OldPhonePad() to return
  result?: string;    // what OldPhonePad() actually returned (set at run time)
  passed?: boolean;   // true if result === expected
}

/**
 * One button on the rendered phone keypad.
 *
 * `key`   — the character that gets appended to inputSequence when pressed.
 * `label` — what's shown in big text on the button face ('1', '2', '⌫', etc.)
 * `sub`   — the small letters shown below the number ('ABC', 'DEF', etc.)
 *           Empty string for keys that have no sub-label (e.g. key '1').
 */
interface KeypadButton {
  key: string;
  label: string;
  sub: string;
}

// =============================================================================
//  COMPONENT
// =============================================================================
@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {

  // ===========================================================================
  //  STATIC / READ-ONLY DATA
  //  These never change after init, so plain readonly fields are fine.
  //  No signals needed here.
  // ===========================================================================

  /**
   * The 12 buttons rendered on the phone in reading order (left-to-right,
   * top-to-bottom).  The template iterates over this array with @for to
   * generate the keypad grid — that way the HTML never needs to hardcode
   * individual buttons.
   *
   * Layout mirrors a real phone:
   *   1, 2, 3
   *   4, 5, 6
   *   7, 8, 9
   *   *, 0, #
   */
  readonly keypadButtons: KeypadButton[] = [
    { key: '1', label: '1',  sub: ''     },
    { key: '2', label: '2',  sub: 'ABC'  },
    { key: '3', label: '3',  sub: 'DEF'  },
    { key: '4', label: '4',  sub: 'GHI'  },
    { key: '5', label: '5',  sub: 'JKL'  },
    { key: '6', label: '6',  sub: 'MNO'  },
    { key: '7', label: '7',  sub: 'PQRS' },
    { key: '8', label: '8',  sub: 'TUV'  },
    { key: '9', label: '9',  sub: 'WXYZ' },
    { key: '*', label: '⌫',  sub: 'BACK' },  // ⌫ is the backspace symbol
    { key: '0', label: '0',  sub: 'SPC'  },
    { key: '#', label: '#',  sub: 'SEND' },
  ];

  /**
   * Data for the Key Mapping Reference table shown in the right column.
   *
   * Each row has the digit key and an array of its letters.  I keep the
   * letters as individual strings in an array (rather than one joined string)
   * because the template renders each letter in its own `<td>`.
   *
   * I intentionally list keys 2-9 and 0, skipping '1' (no letters) and
   * skipping '*'/'#' (they are special keys, not letter keys).
   *
   * Why maintain this separately from KEYPAD_MAP in the service?
   * Because the service stores letters as a plain string ('ABC') which is
   * ideal for index arithmetic, but the table needs them as separate cells.
   * This small data transform here at the component level avoids leaking
   * display concerns into the service layer.
   */
  readonly conversionRows: { key: string; letters: string[] }[] = [
    { key: '2', letters: ['A', 'B', 'C']           },
    { key: '3', letters: ['D', 'E', 'F']           },
    { key: '4', letters: ['G', 'H', 'I']           },
    { key: '5', letters: ['J', 'K', 'L']           },
    { key: '6', letters: ['M', 'N', 'O']           },
    { key: '7', letters: ['P', 'Q', 'R', 'S']      },  // 4 letters
    { key: '8', letters: ['T', 'U', 'V']           },
    { key: '9', letters: ['W', 'X', 'Y', 'Z']      },  // 4 letters
    { key: '0', letters: ['(space)']               },
  ];

  /**
   * The widest any row in the mapping table can be (key 7 and key 9 have 4
   * letters each; all others have 3 or fewer).  Used by getPadding() to fill
   * short rows with empty placeholder cells so every row has the same width.
   */
  readonly maxPresses = 4;

  /**
   * Predefined test cases for the "Test Cases" panel.
   *
   * Why a signal?  Because runAllTests() mutates each entry to add `result`
   * and `passed` — and the template needs to react to that change.  If I used
   * a plain array the template would never know it had been updated.
   *
   * The first four entries are exactly the examples given in the challenge
   * brief (including the hidden TURING answer).  The remaining entries cover
   * the edge cases I thought of while building the solution.
   */
  readonly testCases = signal<TestCase[]>([
    // --- from the brief ---
    { input: '33#',               expected: 'E'      },
    { input: '227*#',             expected: 'B'      },
    { input: '4433555 555666#',   expected: 'HELLO'  },
    { input: '8 88777444666*664#',expected: 'TURING' },
    // --- extra coverage ---
    { input: '2#',                expected: 'A'      },  // single press
    { input: '22#',               expected: 'B'      },
    { input: '222#',              expected: 'C'      },
    { input: '2222#',             expected: 'A'      },  // wrap-around: 4th press = index 0
    { input: '7777#',             expected: 'S'      },  // 4-letter key — index 3
    { input: '222 2 22#',         expected: 'CAB'    },  // spaces separate same-key presses
    { input: '0#',                expected: ' '      },  // space-bar key
    { input: '#',                 expected: ''       },  // nothing typed before send
    { input: '2277**#',           expected: ''       },  // type AB then delete both
    // --- edge cases ---
    { input: '12#',               expected: 'A'      },  // key 1 ignored (no mapping)
    { input: '2#3',               expected: 'A'      },  // chars after # are ignored
    { input: '*#',                expected: ''       },  // backspace on empty = no-op
    { input: '22*#',              expected: ''       },  // in-progress char committed then deleted
    { input: '2 2#',              expected: 'AA'     },  // space forces two separate A's
    { input: '2  2#',             expected: 'AA'     },  // multiple spaces = one separator
    { input: '2 0 3#',            expected: 'A D'    },  // key 0 produces space in output
    { input: '00#',               expected: ' '      },  // key 0 multi-press still one space
    { input: 'FEfefEFzef#',       expected: ''       },  // random garbage up to # = empty
    { input: 'DDDDDDDDDDDDDDDDD', expected: ''       },  // very long string without # = empty
  ]);

  // ===========================================================================
  //  REACTIVE STATE — INTERACTIVE PHONE
  //
  //  These signals track the live state of the simulated phone.  Each one is
  //  directly tied to what the user sees on the phone's LCD screen.
  // ===========================================================================

  /**
   * The raw key-press sequence the user has built up by clicking the on-screen
   * keypad buttons.  Spaces are inserted automatically by the 1-second timer
   * logic in pressKey().
   *
   * Example after pressing 2, 2, 3:  "223"
   * Example after pressing 2, delay, 2, 3:  "2 23"
   * Example after pressing 2, 2, #:  "22#"
   */
  readonly inputSequence = signal('');

  readonly pressedKey = signal('');


  /**
   * The decoded text at any given moment — what the phone screen should show
   * as the OUTPUT line.
   *
   * Implementation note: OldPhonePad() requires '#' at the end.  If the user
   * hasn't pressed it yet I temporarily append one so the algorithm can still
   * return a meaningful partial result for the live preview.
   *
   * This computed re-runs any time inputSequence() changes.
   */
  readonly liveDecoded = computed(() => {
    const seq = this.inputSequence();
    if (!seq) return '';
    // Temporarily append '#' if the user hasn't pressed SEND yet
    const full = seq.endsWith('#') ? seq : seq + '#';
    return OldPhonePadService.OldPhonePad(full);
  });

  /**
   * The single letter being "cycled" right now — the one the user is still
   * building up by pressing the same key repeatedly.
   *
   * This is used to split liveDecoded into a "committed" portion and an
   * "active" portion so I can apply different styling to the letter that is
   * still in flux.
   *
   * How it works:
   *  1. Look at the last character of inputSequence.
   *  2. If it's not a letter key (i.e. the last press was '#', '*', or space)
   *     there is nothing actively cycling, so return ''.
   *  3. Otherwise count how many consecutive times that same key appears at
   *     the END of the sequence (stopping at spaces or different keys) and
   *     use the same (count-1) % length formula as the service.
   *
   * Example: inputSequence = "23322"
   *   Last char = '2', consecutive '2's at end = 2
   *   KEYPAD_MAP['2'] = 'ABC', index = (2-1) % 3 = 1 -> 'B'
   *   currentPreview = 'B'
   */
  readonly currentPreview = computed(() => {
    const seq = this.inputSequence();
    if (!seq) return '';
    const last = seq[seq.length - 1];
    // If the last char isn't a digit key, nothing is being cycled
    if (!(last in OldPhonePadService.KEYPAD_MAP)) return '';
    // Count consecutive identical digits at the tail of the sequence
    let count = 0;
    for (let i = seq.length - 1; i >= 0 && seq[i] === last; i--) count++;
    const letters = OldPhonePadService.KEYPAD_MAP[last];
    return letters ? letters[(count - 1) % letters.length] : '';
  });

  /**
   * Splits liveDecoded into two parts for the template:
   *   `done`   — the committed (finalised) characters
   *   `active` — the character currently being cycled (not yet committed)
   *
   * Why split?  Because in the real phone UX the "active" letter was shown
   * with an underline or highlight to show it could still change.  I recreate
   * that with a pulsing/underline CSS class on the active span.
   *
   * Edge cases handled:
   *  - If nothing is being cycled (active = ''), everything goes into `done`.
   *  - After '#' is pressed (isSent = true), everything is finalised, so
   *    `active` is always '' regardless.
   *  - If the decoded string is empty, both are ''.
   */
  readonly displayOutput = computed(() => {
    const decoded = this.liveDecoded();
    const cycling = this.currentPreview();
    if (!decoded) return { done: '', active: '' };
    if (!cycling || this.isSent()) return { done: decoded, active: '' };
    // The last character of `decoded` is the one still being cycled
    return { done: decoded.slice(0, -1), active: decoded.slice(-1) };
  });

  /**
   * True once the user has pressed '#' (the SEND button).
   * After this, no more key presses are accepted (except CLEAR).
   *
   * I derive this from inputSequence rather than keeping a separate boolean
   * so there is only one source of truth — the sequence itself.
   */
  readonly isSent = computed(() => this.inputSequence().endsWith('#'));

  /**
   * A display-safe version of inputSequence for the "INPUT" line on the
   * phone screen.  Truncated to the last 21 chars with an ellipsis prefix
   * when there is overflow.  22 characters fit comfortably in the LCD area.
   */
  readonly inputSequenceDisplay = computed(() => {
    const seq = this.inputSequence();
    return seq.length > 22 ? '...' + seq.slice(-21) : seq;
  });

  // ===========================================================================
  //  MANUAL INPUT PANEL STATE
  // ===========================================================================

  /** The current value typed into the manual input text field. */
  readonly manualInput = signal('');

  /**
   * The decoded result from the manual input panel.
   * Null = user hasn't clicked Decode yet (so we don't show the result row).
   * Empty string = they decoded something that produced no output.
   */
  readonly manualOutput = signal<string | null>(null);

  /**
   * Holds a validation or runtime error message for the manual input panel.
   * Null = no error.  Set when the input exceeds 500 chars or contains no
   * valid keypad digits at all.
   */
  readonly manualError = signal<string | null>(null);

  // ===========================================================================
  //  PRIVATE TIMING STATE
  //
  //  These are NOT signals because the template never reads them directly —
  //  they are internal bookkeeping for the 1-second same-key separator logic.
  //  Using plain properties is simpler and avoids unnecessary reactive overhead.
  // ===========================================================================

  /**
   * After pressing a digit key, this stores that key's character so that if
   * the SAME key is pressed again AFTER the timer fires (meaning the user
   * waited over 1 second), we know to insert a space before appending the
   * new press.
   *
   * Reset to '' when:
   *   - a DIFFERENT key is pressed (no need for a separator)
   *   - '#' or '*' is pressed
   *   - clearInput() is called
   */
  private awaitingSpaceForKey = '';

  /**
   * Handle returned by setTimeout so we can cancel it (via clearTimeout)
   * if the user presses another key before the 1-second timer fires.
   * null = no timer currently running.
   */
  private pressTimer: ReturnType<typeof setTimeout> | null = null;

  // ===========================================================================
  //  KEYPAD INTERACTION
  // ===========================================================================

  /**
   * Called by the template when any on-screen button is clicked.
   *
   * This method is the heart of the "interactive phone" feel.  It handles
   * all three kinds of keys differently:
   *
   *  '#' (Send)
   *    Just append '#' to the sequence.  The isSent computed will flip to
   *    true and the template will disable all digit/backspace buttons.
   *
   *  '*' (Backspace)
   *    Append '*' to the sequence.  The service's OldPhonePad algorithm
   *    interprets '*' as backspace internally — I don't need to do the
   *    deletion myself here in the component.
   *
   *  Digit keys (0-9 except 1 which is in the keypad but has no letters)
   *    The tricky part.  On a real phone, pressing 2 twice quickly gives 'B'.
   *    Pressing 2, waiting a second, then pressing 2 again gives 'A' then 'A'
   *    (two separate A's).
   *
   *    I implement this with a 1-second setTimeout:
   *      - When a digit key is pressed, I cancel any pending timer and append
   *        the digit directly.
   *      - I then START a new 1-second timer.  If it fires without the same
   *        key being pressed again, I set awaitingSpaceForKey = that digit.
   *      - If the user presses the SAME digit while awaitingSpaceForKey is
   *        set to that digit, I prefix a space before appending it.
   *        That space is the separator the OldPhonePad algorithm uses.
   *
   * @param key  The character on the button that was clicked.
   */
  pressKey(key: string): void {
    // If the user already sent the message, ignore all keys except '*' (undo)
    // or '#' (actually we allow '#' to be a no-op but the template disables it)
    if (this.isSent()) return;

    // Cancel the existing timer whenever any key is pressed.
    // It will be restarted at the end of this method if needed.
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }

    // Brief visual flash: set the pressed key, clear it 150ms later
    this.pressedKey.set(key);
    setTimeout(() => this.pressedKey.set(''), 150);

    // --- Handle '#' (Send) ---------------------------------------------------
    if (key === '#') {
      this.inputSequence.update(s => s + '#');
      this.awaitingSpaceForKey = '';
      return;
      // No timer needed — no same-key logic applies after send
    }

    // --- Handle '*' (Backspace) ----------------------------------------------
    if (key === '*') {
      this.awaitingSpaceForKey = '';  // cancel any pending same-key wait
      this.inputSequence.update(s => s + '*');
      return;
      // No timer needed — backspace is a discrete action
    }

    // --- Handle digit keys ---------------------------------------------------
    // If we are waiting on this same key (the 1s timer already fired), then
    // the user paused long enough that this should be a NEW character.
    // Insert a space separator first.
    if (this.awaitingSpaceForKey === key) {
      this.inputSequence.update(s => s + ' ' + key);
    } else {
      // Either a different key, or the same key pressed quickly (within 1s)
      this.inputSequence.update(s => s + key);
    }

    // Reset the same-key wait — the previous awaitingSpaceForKey may have been
    // for this key or a different one; either way it's now stale.
    this.awaitingSpaceForKey = '';

    // Start the 1-second timer.  If it fires before the user presses again,
    // we know the next press of this same key should be a separator + new char.
    this.pressTimer = setTimeout(() => {
      this.awaitingSpaceForKey = key;
      this.pressTimer = null;
    }, 1000);
  }

  /**
   * Resets the phone back to its blank initial state.
   * Cancels any pending timer so we don't get a ghost space injection
   * after clearing.
   */
  clearInput(): void {
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    this.awaitingSpaceForKey = '';
    this.inputSequence.set('');
  }

  // ===========================================================================
  //  MANUAL DECODE PANEL
  // ===========================================================================

  /**
   * Fired on every keystroke in the manual input field.
   * Clears the previous decoded result so it doesn't linger while the user
   * is still typing the new sequence.
   */
  onManualInput(event: Event): void {
    this.manualInput.set((event.target as HTMLInputElement).value);
    this.manualOutput.set(null);  // hide stale result
    this.manualError.set(null);   // clear previous error
  }

  /**
   * Fired when the user clicks "Decode" or presses Enter in the input field.
   * Passes the raw sequence to OldPhonePad (appending '#' if missing) and
   * stores the result so the template can display it.
   */
  decodeManual(): void {
    const raw = this.manualInput().trim();
    if (!raw) return;

    // Validate: must contain at least one digit (0-9)
    // Letters and other characters are silently ignored by the algorithm,
    // so a string with no digits at all would always produce empty output —
    // better to tell the user up front.
    if (!/\d/.test(raw)) {
      this.manualError.set('Input contains no keypad digits (0–9).');
      this.manualOutput.set(null);
      return;
    }

    // The service always needs a '#' terminator — add it if the user forgot
    const seq = raw.endsWith('#') ? raw : raw + '#';

    try {
      this.manualError.set(null);
      this.manualOutput.set(OldPhonePadService.OldPhonePad(seq));
    } catch (err) {
      // The service throws when input exceeds 500 characters
      this.manualError.set(err instanceof Error ? err.message : 'Invalid input.');
      this.manualOutput.set(null);
    }
  }

  // ===========================================================================
  //  TEST RUNNER
  // ===========================================================================

  /**
   * Runs every entry in testCases through OldPhonePad() and annotates each
   * one with the `result` and `passed` fields.
   *
   * I use signal.update() here rather than signal.set() because it lets me
   * derive the new array from the current one with .map() — clean and
   * immutable-style.  Angular detects the new array reference and re-renders
   * the test list.
   */
  runAllTests(): void {
    this.testCases.update(cases =>
      cases.map(tc => {
        const result = OldPhonePadService.OldPhonePad(tc.input);
        return { ...tc, result, passed: result === tc.expected };
      }),
    );
  }

  // ===========================================================================
  //  TEMPLATE HELPERS
  // ===========================================================================

  /**
   * Returns an array of the right length to fill empty cells in the mapping
   * table.  Not every key has 4 letters — keys with fewer letters need
   * placeholder "—" cells to keep columns aligned.
   *
   * Example: key '2' has 3 letters, maxPresses = 4 -> returns [0] (length 1)
   *          key '7' has 4 letters, maxPresses = 4 -> returns []  (length 0)
   *
   * The template uses this with @for to render the right number of <td> cells.
   * The actual VALUES in the array don't matter, only the length.
   *
   * @param letterCount  How many letters this key has (row.letters.length)
   */
  getPadding(letterCount: number): number[] {
    return Array(Math.max(0, this.maxPresses - letterCount)).fill(0);
  }

  // ===========================================================================
  //  LIFECYCLE
  // ===========================================================================

  /**
   * Angular calls ngOnDestroy when the component is removed from the DOM.
   * I use it to cancel the 1-second timer if it's still running — this
   * prevents a stale callback from firing after the component is gone (which
   * would cause Angular to throw a "signal written after destroy" error).
   *
   * Implementing OnDestroy also serves as documentation that this component
   * has a resource it needs to clean up.
   */
  ngOnDestroy(): void {
    if (this.pressTimer !== null) clearTimeout(this.pressTimer);
  }
}
