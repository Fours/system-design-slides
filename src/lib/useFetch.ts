import { useEffect, useState } from "react";

export type FetchState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ok"; data: T };

/** Runs `load` whenever `key` changes and tracks its result. */
export function useFetch<T>(key: string, load: () => Promise<T>): FetchState<T> {
  const [state, setState] = useState<{ key: string; value: FetchState<T> }>({ key, value: { status: "loading" } });

  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ key, value: { status: "ok", data } }),
      (error: Error) => live && setState({ key, value: { status: "error", error } }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state.key === key ? state.value : { status: "loading" };
}
