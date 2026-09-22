export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw signal.reason;
  }
}

export async function waitForContinuation(
  continuation: PromiseLike<unknown>,
  signal: AbortSignal | undefined,
  onAbort?: () => void,
): Promise<void> {
  if (signal === undefined) {
    await continuation;
    return;
  }

  if (signal.aborted) {
    void Promise.resolve(continuation).catch(() => {});
    onAbort?.();
    throw signal.reason;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = (): void => {
      signal.removeEventListener('abort', handleAbort);
    };

    const handleAbort = (): void => {
      if (settled) return;
      settled = true;
      cleanup();

      try {
        onAbort?.();
      } catch {
        // Cancellation must preserve the signal's original reason.
      }

      reject(signal.reason);
    };

    signal.addEventListener('abort', handleAbort, { once: true });

    Promise.resolve(continuation).then(
      () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
}
