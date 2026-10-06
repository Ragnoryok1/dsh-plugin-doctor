/**
 * Test fixture: fails on purpose.
 *
 * The diagnostics plugin claims it can report a plugin that did not load, and
 * that claim needs a real broken plugin to be worth anything. Installing this
 * one produces exactly that: a row the profile declares whose start always
 * throws, so the panel has something it must find.
 */

/** Host-side entry point that always fails, with a distinctive message. */
export function apply(): never {
  throw new Error('doctor-canary: intentional startup failure (test fixture)')
}
