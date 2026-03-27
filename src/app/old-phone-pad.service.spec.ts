// =============================================================================
//  old-phone-pad.service.spec.ts  —  Unit tests for OldPhonePadServicio
//
//  TESTING FRAMEWORK: Vitest (via Angular 21's @angular/build:unit-test)
//  Vitest is Jest-compatible, so if you know Jest you already know this.
//
//  WHY THESE TESTS EXIST
//  =====================
//  The spec covers every behaviour I could think of for OldPhonePad():
//
//   1. The four examples directly from the challenge brief
//      (I wanted to be sure those passed before anything else)
//
//   2. Single press on every digit key
//      (sanity-checks the KEYPAD_MAP values)
//
//   3. Letter cycling within a single key, including wrap-around
//      (the modulo trick must work for all cycle lengths)
//
//   4. The space separator — typing same-key letters in sequence
//      (the core multi-letter-per-key mechanic)
//
//   5. Switching between different keys
//      (no separator needed when keys are different)
//
//   6. Backspace '*' — including the tricky case where it commits
//      the in-progress character first before deleting
//
//   7. Key 0 — the space character output
//
//   8. Edge cases: empty input, key ', string too long string, bad data1' (no letters), stop after '#'
//
//   9. KEYPAD_MAP constant check — 2: A -> B -> C -> wraps to A
//        ...
//
//  CONVENIENCE ALIAS
//  =================
//  I create a local `OldPhonePad` alias at the top so the test bodies
//  read exactly like a normal function call — matching the challenge signature.
// =============================================================================

import { OldPhonePadService } from './old-phone-pad.service';

// Alias so the tests look like:  expect(OldPhonePad('33#')).toBe('E')
// rather than: expect(OldPhonePadService.OldPhonePad('33#')).toBe('E')
// Both work identically — this is just a readability choice.
const OldPhonePad = (input: string) => OldPhonePadService.OldPhonePad(input);

// =============================================================================
describe('OldPhonePadService', () => {

  // ---------------------------------------------------------------------------
  //  GROUP 1 — THE FOUR EXAMPLES FROM THE CHALLENGE BRIEF
  //
  //  These are the exact examples given in the problem statement.
  //  I wrote these first and used them as the acceptance criteria to know
  //  when my algorithm was working correctly.
  //
  //  The last one ("8 88777444666*664#" -> "TURING") has a hidden meaning:
  //  the submission email is turing@ironsoftware.com — a nod to Alan Turing!
  // ---------------------------------------------------------------------------
  describe('provided examples from the brief', () => {

    it('OldPhonePad("33#") returns "E"', () => {
      // key 3 pressed twice: DEF[1] = 'E'
      expect(OldPhonePad('33#')).toBe('E');
    });

    it('OldPhonePad("227*#") returns "B"', () => {
      // 22 -> B, 7 -> P (first letter of PQRS), * deletes P, # ends -> "B"
      expect(OldPhonePad('227*#')).toBe('B');
    });

    it('OldPhonePad("4433555 555666#") returns "HELLO"', () => {
      expect(OldPhonePad('4433555 555666#')).toBe('HELLO');
    });

    it('OldPhonePad("8 88777444666*664#") returns "TURING"', () => {
      expect(OldPhonePad('8 88777444666*664#')).toBe('TURING');
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 2 — SINGLE PRESS = FIRST LETTER
  //
  //  One press of any key   //
  //  I use it.each() here to avoid writing 8 near-identical test blocks.
  //  The format is: [input, expected]
  // ---------------------------------------------------------------------------
  describe('single press selects the first letter of each key', () => {

    it.each([
      ['2#', 'A'],  // ABC[0]
      ['3#', 'D'],  // DEF[0]
      ['4#', 'G'],  // GHI[0]
      ['5#', 'J'],  // JKL[0]
      ['6#', 'M'],  // MNO[0]
      ['7#', 'P'],  // PQRS[0]
      ['8#', 'T'],  // TUV[0]
      ['9#', 'W'],  // WXYZ[0]
    ])('OldPhonePad("%s") returns "%s"', (input, expected) => {
      expect(OldPhonePad(input)).toBe(expected);
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 3 — CYCLING THROUGH LETTERS ON A SINGLE KEY
  //
  //  This group tests the core multi-press cycling behaviour:
  //    pre //
  //  I specifically test keys 7 and 9 (four letters each) because they are
  //  the only keys that break the "3 letters per key" assumption.
  // ---------------------------------------------------------------------------
  describe('cycling through letters on a single key', () => {

    it('key 2 cycles A -> B -> C -> back to A (3-letter wrap)', () => {
      expect(OldPhonePad('2#')).toBe('A');     // 1 press  -> index 0
      expect(OldPhonePad('22#')).toBe('B');    // 2 presses -> index 1
      expect(OldPhonePad('222#')).toBe('C');   // 3 presses -> index 2
      expect(OldPhonePad('2222#')).toBe('A');  // 4 presses -> index 0 (wraps!)
    });

    it('key 3 cycles D -> E -> F -> back to D', () => {
      expect(OldPhonePad('3#')).toBe('D');
      expect(OldPhonePad('33#')).toBe('E');
      expect(OldPhonePad('333#')).toBe('F');
      expect(OldPhonePad('3333#')).toBe('D');  // wraps
    });

    it('key 7 has FOUR letters (PQRS) — tests the 4-letter edge case', () => {

      expect(OldPhonePad('7#')).toBe('P');      // PQRS[0]
      expect(OldPhonePad('77#')).toBe('Q');     // PQRS[1]
      expect(OldPhonePad('777#')).toBe('R');    // PQRS[2]
      expect(OldPhonePad('7777#')).toBe('S');   // PQRS[3]
      expect(OldPhonePad('77777#')).toBe('P');  // 5 presses -> wraps to PQRS[0]
    });

    it('key 9 has FOUR letters (WXYZ)', () => {
      expect(OldPhonePad('9#')).toBe('W');
      expect(OldPhonePad('99#')).toBe('X');
      expect(OldPhonePad('999#')).toBe('Y');
      expect(OldPhonePad('9999#')).toBe('Z');
      expect(OldPhonePad('99999#')).toBe('W');  // wraps after 4
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 4 — SPACE SEPARATOR (same key, different characters)
  //
  //  A space in the input means: "commit whatever letter I was building up,
  //  and start fresh for the next press, even if it's the same key."
  //
  //  Without spaces:  "222" -> 'C'   (3 presses of key 2)
  //  With spaces:    "222 2 22" -> "CAB"  (C, pause, A, pause, B)
  //
  //  This is the trickiest part of the problem to understand at first.
  // ---------------------------------------------------------------------------
  describe('space separator for same-key consecutive characters', () => {

    it('"222 2 22#" -> "CAB" (the example from the problem statement)', () => {
      expect(OldPhonePad('222 2 22#')).toBe('CAB');
    });

    it('"2 2#" -> "AA" (space forces two separate A\'s)', () => {
      // Without the space "22" -> 'B'.  With it: 'A' then 'A'.
      expect(OldPhonePad('2 2#')).toBe('AA');
    });

    it('multiple consecutive spaces still only produce one separator', () => {
      // The second (and any subsequent) space calls commitCurrent() again,
      // but there is nothing pending at that point, so it is a safe no-op.
      expect(OldPhonePad('2  2#')).toBe('AA');
    });

    it('space after a single press commits that letter before next run', () => {
      // "2 22" -> A (committed by space), then B (two presses of 2) -> "AB"
      expect(OldPhonePad('2 22#')).toBe('AB');
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 5 — SWITCHING BETWEEN DIFFERENT KEYS
  //
  //  When the user presses a DIFFERENT key after pressing one key,
  //  the algorithm automatically commits the previous character.
  //  No space separator is needed between different keys.
  // ---------------------------------------------------------------------------
  describe('switching between different keys (no space needed)', () => {

    it('"23#" -> "AD" (key 2 then key 3, each pressed once)', () => {
      expect(OldPhonePad('23#')).toBe('AD');
    });

    it('"4433555 555666#" -> "HELLO" (full word, space only within same key)', () => {
      // The space only appears between the two '5' runs (555 555)
      // because that is the only place the same key is used twice.
      expect(OldPhonePad('4433555 555666#')).toBe('HELLO');
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 6 — BACKSPACE (*)
  //
  //  '*' deletes the most recently committed character.
  //
  //  IMPORTANT: if there is a character in progress (e.g. "22" building up 'B')
  //  when '*' is encountered, that character is COMMITTED first — and then
  //  immediately deleted.  So "22*" -> commits 'B', deletes 'B' -> "".
  //
  //  This behaviour is what the real T9 phone did: you could only backspace
  //  finished characters, not half-typed ones.
  // ---------------------------------------------------------------------------
  describe('backspace (*)', () => {

    it('"227*#" -> "B" (commits P, then * deletes it)', () => {
      // 22 -> B committed, then 7 starts building P, * commits P and deletes it
      expect(OldPhonePad('227*#')).toBe('B');
    });

    it('"23*#" -> "A" (backspace deletes the last committed letter)', () => {
      // 2 -> A committed, 3 -> D committed, * deletes D -> "A"
      expect(OldPhonePad('23*#')).toBe('A');
    });

    it('"2277**#" -> "" (multiple backspaces, deletes everything)', () => {
      // 22 -> B, 77 -> Q, * deletes Q, * deletes B -> ""
      expect(OldPhonePad('2277**#')).toBe('');
    });

    it('backspace on an empty result is a safe no-op', () => {
      // No characters to delete — should not crash or produce garbage
      expect(OldPhonePad('*#')).toBe('');
      expect(OldPhonePad('**#')).toBe('');  // two backspaces on nothing
    });

    it('"22*#" -> "" (in-progress char is committed THEN deleted by *)', () => {
      // This is the subtle case: "22" is building 'B', then * fires.
      // Order: commit 'B' (result = "B"), then delete 'B' (result = "")
      expect(OldPhonePad('22*#')).toBe('');
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 7 — KEY 0 (space character in output)
  //
  //  Key 0 maps to a single space character ' ' in the output.
  //  This is how T9 phones created word boundaries.
  // ---------------------------------------------------------------------------
  describe('key 0 produces a space character in the output', () => {

    it('"0#" -> " " (a single output space)', () => {
      expect(OldPhonePad('0#')).toBe(' ');
    });

    it('pressing 0 multiple times still gives one space (only one letter mapped)', () => {
      // 0 maps to ' ' (one letter), so (2-1) % 1 = 0 -> still ' '
      expect(OldPhonePad('00#')).toBe(' ');
    });

    it('key 0 can be used between letters to create word spacing', () => {
      // "2 0 3": A (committed by space), then 0 -> ' ' (committed by space), then D
      expect(OldPhonePad('2 0 3#')).toBe('A D');
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 8 — EDGE CASES
  //
  //  Corner cases I thought of that could break a naive implementation.
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {

    it('"#" with nothing before it returns an empty string', () => {
      // The send button pressed immediately — no text typed
      expect(OldPhonePad('#')).toBe('');
    });

    it('random string with no # returns an empty string', () => {
      // The send button pressed immediately — no text typed
      expect(OldPhonePad('FEfefEFzefzefRBHRTB')).toBe('');
    });

    it('very long string with no # returns an empty string', () => {
      // The send button pressed immediately — no text typed
      expect(OldPhonePad('DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD')).toBe('');
    });

    it('key 1 has no letter mapping and is silently ignored', () => {
      // On real T9 phones, key 1 held punctuation or was unused for text.
      // The problem says to ignore it.  "12#" -> just 'A' (the '1' is skipped).
      expect(OldPhonePad('12#')).toBe('A');
    });

    it('everything after the first # is ignored', () => {
      // The algorithm breaks out of its loop at the first '#'.
      expect(OldPhonePad('2#3')).toBe('A');    // '3' after '#' is ignored
      expect(OldPhonePad('2#3#')).toBe('A');   // second '#' also ignored
    });

  });

  // ---------------------------------------------------------------------------
  //  GROUP 9 — KEYPAD_MAP CONSTANT VERIFICATION
  //
  //  Quick sanity check that the raw data in KEYPAD_MAP is correct.
  //  If this ever fails it means someone accidentally edited the map values.
  // ---------------------------------------------------------------------------
  describe('KEYPAD_MAP contains correct letter groups', () => {

    it('all nine digit keys map to the right letters', () => {
      expect(OldPhonePadService.KEYPAD_MAP['2']).toBe('ABC');
      expect(OldPhonePadService.KEYPAD_MAP['3']).toBe('DEF');
      expect(OldPhonePadService.KEYPAD_MAP['4']).toBe('GHI');
      expect(OldPhonePadService.KEYPAD_MAP['5']).toBe('JKL');
      expect(OldPhonePadService.KEYPAD_MAP['6']).toBe('MNO');
      expect(OldPhonePadService.KEYPAD_MAP['7']).toBe('PQRS');
      expect(OldPhonePadService.KEYPAD_MAP['8']).toBe('TUV');
      expect(OldPhonePadService.KEYPAD_MAP['9']).toBe('WXYZ');
      expect(OldPhonePadService.KEYPAD_MAP['0']).toBe(' ');   // the space key
    });

    it('key 1 is NOT in KEYPAD_MAP (it has no letter assignments)', () => {
      expect(OldPhonePadService.KEYPAD_MAP['1']).toBeUndefined();
    });

  });

});
