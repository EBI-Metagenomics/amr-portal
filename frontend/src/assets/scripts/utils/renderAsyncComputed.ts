import type {AsyncComputed} from 'signal-utils/async-computed';

// From: https://justinfagnani.com/2024/10/09/reactive-state-with-signals-in-lit/

export const renderAsyncComputed = <T>(
  v: AsyncComputed<T>,
  {
    initial,
    pending,
    complete,
    error,
  }: {
    initial?: () => T;
    pending?: () => T;
    complete?: (value: any) => T;
    error?: (error: any) => T;
  }
) => {
  switch (v.status) {
    case 'initial':
      return initial?.();
    case 'pending':
      return pending?.();
    case 'complete':
      return complete?.(v.value);
    case 'error':
      return error?.(v.error);
  }
};
