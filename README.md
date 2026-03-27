# Old Phone Pad

An Angular 21 application that implements the classic T9-style phone keypad decoder.

---

## The Problem

Old mobile phones used a 3×4 keypad where each number button maps to multiple letters. Pressing a button **n** times selects the **nth** letter on that key:

```
Press 2 once  → A
Press 2 twice → B
Press 2 three times → C
Press 2 four times  → A  (wraps around)
```

To type **two consecutive characters from the same key**, pause for a second between groups — represented by a **space** in the input string:

```
"222 2 22"  →  "CAB"
  C   A  B
```

### Special Keys

| Key | Meaning |
|-----|---------|
| `*` | Backspace — deletes the last committed character |
| `#` | Send — ends the input and returns the result |

---

## Key Mapping Reference

| Key | 1× | 2× | 3× | 4× |
|-----|----|----|----|----|
| 2   | A  | B  | C  |    |
| 3   | D  | E  | F  |    |
| 4   | G  | H  | I  |    |
| 5   | J  | K  | L  |    |
| 6   | M  | N  | O  |    |
| 7   | P  | Q  | R  | S  |
| 8   | T  | U  | V  |    |
| 9   | W  | X  | Y  | Z  |
| 0   | *(space)* |  |  |  |

---

## Examples

| Input | Output | Explanation |
|-------|--------|-------------|
| `33#` | `E` | 3×2 = index 1 in "DEF" |
| `227*#` | `B` | 22→B, 7→P, `*` deletes P |
| `4433555 555666#` | `HELLO` | 44→H, 33→E, 555→L, space, 555→L, 666→O |
| `8 88777444666*664#` | `TURING` | 8→T, 88→U, 777→R, 444→I, 666→O, `*` deletes O, 66→N, 4→G |

---

## Solution Design

### Core Algorithm — `OldPhonePadService.OldPhonePad(input)`

Located in [`src/app/old-phone-pad.service.ts`](src/app/old-phone-pad.service.ts).

```typescript
public static OldPhonePad(input: string): string
```

The method does a **single linear pass** over the input string, maintaining two pieces of state:

| Variable | Purpose |
|----------|---------|
| `currentKey` | The digit key currently being pressed repeatedly |
| `pressCount` | How many consecutive times it has been pressed |

**Transitions:**

| Character | Action |
|-----------|--------|
| Same digit as `currentKey` | Increment `pressCount` |
| Different digit | Commit the current char, then start a new run |
| `' '` (space) | Commit the current char and pause |
| `'*'` | Commit the current char, then delete the last output char |
| `'#'` | Commit the current char and terminate |

**Commit function:**
```typescript
result += KEYPAD_MAP[currentKey][(pressCount - 1) % letterCount];
```
The modulo operator handles the wrap-around for keys like `7` (PQRS) when pressed 5+ times.

**Complexity:**
- Time:  **O(n)** — single pass
- Space: **O(n)** — output at most as long as input

---

## Features

| Feature | Description |
|---------|-------------|
| Interactive keypad | Click on-screen phone buttons to build sequences |
| Live preview | Output updates in real time with a blinking cursor on the active character |
| Space insertion | Pressing the same key twice is separated by a 1-second timer (mirrors real phone behaviour) |
| Manual input | Type any sequence directly and decode it instantly |
| Key mapping table | Visual reference showing every key → letter mapping |
| Test cases runner | One-click execution of all predefined tests with pass/fail badges |

---

## Project Structure

```
src/
  app/
    old-phone-pad.service.ts        ← Core algorithm (pure static class)
    old-phone-pad.service.spec.ts   ← Unit tests for the algorithm (Vitest)
    app.ts                          ← Angular component (signals-based)
    app.html                        ← Component template
    app.scss                        ← Component styles
    app.spec.ts                     ← Component integration tests
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+

### Install

```bash
cd old-phone-pad
npm install
```

### Development Server

```bash
npm start
```

Navigate to `http://localhost:4200/`.

### Run Tests

```bash
npm test
```

Tests are run with **Vitest** via the Angular 21 `@angular/build:unit-test` builder.
All 30+ test cases should pass.

---

## Test Coverage

The service spec (`old-phone-pad.service.spec.ts`) includes:

- All four examples from the challenge brief
- Single press for every digit key
- Full cycling (including wrap-around) for keys 2–9
- Key 7 and key 9 (four-letter keys — PQRS / WXYZ)
- Space separator between same-key presses
- Backspace (`*`) — basic, multiple, and on-empty
- Key 0 (space character output)
- Edge cases: empty input (`#`), key 1 (no letters), stop after first `#`

---
