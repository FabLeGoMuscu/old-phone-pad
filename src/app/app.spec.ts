// =============================================================================
//  app.spec.ts  —  Integration tests for the AppComponent (root UI component)
//  Author: Fabrizio
//

import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';

// =============================================================================
describe('AppComponent', () => {

  // ---------------------------------------------------------------------------
  //  BeforeEach: set up a fresh TestBed for every single test.
  //
  //
  //  AppComponent is a standalone component, so we just declare it directly.
  //  No NgModule needed — that is one of the nicest parts of Angular 21!
  // ---------------------------------------------------------------------------
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  // ---------------------------------------------------------------------------
  //  TEST 1 — THE COMPONENT CREATES WITHOUT THROWING
  //
  //  This is the most basic smoke test: does the component construct at all?
  //  If it crashes during construction (missing injection, bad template syntax,
  //  etc.) this test catches it before anything else runs.
  // ---------------------------------------------------------------------------
  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  //  TEST 2 — PAGE HEADING IS CORRECT
  //
  //  Makes sure the main heading text I put in the template is actually what
  //  gets rendered.  If I rename the app this would need updating.
  // ---------------------------------------------------------------------------
  it('should render "Old Phone Pad Decoder" in the heading', async () => {
    const fixture = TestBed.createComponent(AppComponent);

    // detectChanges() runs the first change-detection cycle, which:
    //   1. Evaluates all computed signals
    //   2. Applies interpolation ({{}}), attribute bindings ([attr]), etc.
    //   3. Renders @if / @for blocks
    fixture.detectChanges();
    await fixture.whenStable();  // wait for any async initialisation to settle

    const compiled = fixture.nativeElement as HTMLElement;

    // The heading might be h1 or h2, so I search the whole text content
    expect(compiled.textContent).toContain('Old Phone Pad Decoder');
  });

  // ---------------------------------------------------------------------------
  //  TEST 3 — INITIAL STATE (nothing typed yet)
  //
  //  When the component first loads, all the "phone" signals should be at
  //  their default empty/false values.  This is important to verify because
  //  if anything runs inadvertently during construction it could break the UX.
  // ---------------------------------------------------------------------------
  it('should start with empty inputSequence, no pressedKey, not isSent', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    // Reading a signal: call it like a function — app.inputSequence()
    // This is how Angular signals work: they are getter functions.
    expect(app.inputSequence()).toBe('');
    expect(app.pressedKey()).toBeNull();
    expect(app.isSent()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  //  TEST 4 — PRESSING A DIGIT KEY UPDATES inputSequence
  //
  //  Simulates the user tapping the "2" key on the phone pad.
  //  After the press, the inputSequence signal should contain '22'
  //  (because the timer hasn't fired yet, so pressing the same key
  //  twice in quick succession just appends).
  // ---------------------------------------------------------------------------
  it('should append to inputSequence when a digit key is pressed', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    // Call the component's pressKey() method directly — same as if the user
    // clicked the button in the template.
    app.pressKey('2');
    app.pressKey('2');

    // liveDecoded is a computed that calls OldPhonePad(inputSequence + '#')
    // After two presses of '2', the sequence is "22" -> decoded "B"
    expect(app.inputSequence()).toBe('22');
    expect(app.liveDecoded()).toBe('B');
  });

  // ---------------------------------------------------------------------------
  //  TEST 5 — PRESSING '#' SETS isSent TO TRUE
  //
  //  The '#' key is the 'send' button.  After pressing it, the isSent
  //  computed should become true (because the sequence ends with '#').
  // ---------------------------------------------------------------------------
  it('should set isSent to true when "#" is pressed', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.pressKey('2');
    app.pressKey('#');

    // isSent is a computed signal: inputSequence().endsWith('#')
    expect(app.isSent()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  //  TEST 6 — CLEAR INPUT RESETS EVERYTHING
  //
  //  After typing, clearInput() should bring all signals back to default.
  //  This simulates the user pressing the red "Clear" button.
  // ---------------------------------------------------------------------------
  it('should reset inputSequence and isSent after clearInput()', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    // Type something first
    app.pressKey('2');
    app.pressKey('2');
    app.pressKey('#');

    // Now clear
    app.clearInput();

    // Both the sequence and the sent-state should be gone
    expect(app.inputSequence()).toBe('');
    expect(app.isSent()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  //  TEST 7 — runAllTests() MARKS EVERY TEST CASE AS PASSED
  //
  //  The UI has a built-in test runner that evaluates the four official
  //  challenge examples.  After calling runAllTests(), every test item in
  //  the testCases signal should have passed = true.
  //
  //  This is an end-to-end assertion: it proves the service AND the component
  //  glue code (runAllTests method) work together correctly.
  // ---------------------------------------------------------------------------
  it('should have all test cases passing after runAllTests()', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.runAllTests();

    // testCases() returns the current value of the signal — an array of
    // { input, expected, result, passed } objects.
    const cases = app.testCases();
    expect(cases.length).toBeGreaterThan(0);  // there are some test cases

    // Every single case must have passed
    const allPassed = cases.every(c => c.passed === true);
    expect(allPassed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  //  TEST 8 — decodeManual() WITH A TRAILING '#'
  //
  //  The manual decode panel lets the user type raw sequences.
  //  If the input already ends with '#', the decode is used as-is.
  // ---------------------------------------------------------------------------
  it('decodeManual() correctly decodes a sequence that has a "#"', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    // Set the manual input signal directly, then call the decode method
    app.manualInput.set('4433555 555666#');
    app.decodeManual();

    // manualOutput should contain the decoded word
    expect(app.manualOutput()).toBe('HELLO');
  });

  // ---------------------------------------------------------------------------
  //  TEST 9 — decodeManual() WITHOUT A TRAILING '#'
  //
  //  If the user forgets to type '#' at the end, decodeManual() should
  //  append one automatically so the algorithm terminates correctly.
  // ---------------------------------------------------------------------------
  it('decodeManual() appends "#" automatically if missing', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    // No '#' at the end — the method should still work
    app.manualInput.set('4433555 555666');
    app.decodeManual();

    expect(app.manualOutput()).toBe('HELLO');
  });

  // ---------------------------------------------------------------------------
  //  TEST 10 — liveDecoded() COMPUTES REACTIVELY FROM inputSequence
  //
  //  liveDecoded is a computed signal — it automatically recalculates
  //  whenever inputSequence changes.  This test verifies that reactivity.
  // ---------------------------------------------------------------------------
  it('liveDecoded() updates reactively when inputSequence changes', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    // Start empty
    expect(app.liveDecoded()).toBe('');

    // Press key '3' twice — should give 'E'
    app.pressKey('3');
    app.pressKey('3');
    expect(app.liveDecoded()).toBe('E');
  });

});
