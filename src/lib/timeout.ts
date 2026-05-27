export function timeoutMessage(action: string) {
  return `Tempo esgotado ao ${action}. Tente novamente em instantes.`;
}

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  milliseconds: number,
  message: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (cause) {
    if (controller.signal.aborted) throw new Error(message);
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}
