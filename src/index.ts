/**
 * Host half of the diagnostics plugin.
 *
 * The checks run in the client half, which reaches the plugin manager over the
 * Remote protocol; the host half exists so the package has a loadable node
 * entry, exactly as the locale pack does. Everything the doctor reports comes
 * from supported services, never from reading another package's internals.
 */

/** Host-side entry point. Nothing to register until a host-side check is added. */
export function apply(): void {}
