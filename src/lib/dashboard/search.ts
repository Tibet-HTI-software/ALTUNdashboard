/**
 * Global search-query store.
 *
 * The topbar search box writes here; the Shipments / Customers / Quotes
 * sub-pages read it so a single query filters whatever the user is looking
 * at. Not persisted (a search term should not survive a reload) — a
 * module-level value keeps it alive across route changes, and a custom
 * event keeps every consumer in the tab in sync.
 */

import { useEffect, useState } from "react";

const SEARCH_EVENT = "altun-search-change";

/** Lives at module scope so the query survives route navigation. */
let currentQuery = "";

/** Returns `{ query, setQuery }`, synced across all consumers in the tab. */
export function useGlobalSearch(): {
  query: string;
  setQuery: (next: string) => void;
} {
  const [query, setQueryState] = useState(currentQuery);

  useEffect(() => {
    // Adopt any value set before this consumer mounted.
    if (currentQuery !== query) setQueryState(currentQuery);

    function onCustom(e: Event) {
      setQueryState((e as CustomEvent<string>).detail);
    }
    window.addEventListener(SEARCH_EVENT, onCustom);
    return () => window.removeEventListener(SEARCH_EVENT, onCustom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setQuery(next: string) {
    currentQuery = next;
    setQueryState(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: next }));
    }
  }

  return { query, setQuery };
}
