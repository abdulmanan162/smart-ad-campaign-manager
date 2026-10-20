import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs `fn` whenever `deps` change; ignores stale responses. Returns data, error, loading and a reload(). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const callId = useRef(0);

  const run = useCallback(fn, deps);

  const reload = useCallback(() => {
    const id = ++callId.current;
    setLoading(true);
    run()
      .then((d) => {
        if (id === callId.current) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => id === callId.current && setError(e.message))
      .finally(() => id === callId.current && setLoading(false));
  }, [run]);

  useEffect(reload, [reload]);

  return { data, error, loading, reload };
}
