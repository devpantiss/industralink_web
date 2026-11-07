import { useEffect, useState } from "react";

/** True while the media query matches, e.g. useMediaQuery("(min-width: 1024px)"). */
export function useMediaQuery(query: string) {
  const get = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return matches;
}
