import { useLayoutEffect, useRef, type DependencyList } from "react";

/**
 * Moves a highlight (underline or pill) to the active item inside a container.
 * The active item is the one marked aria-current="page", aria-selected="true" or aria-pressed="true".
 * Put `ref={box}` on a `relative` container and `ref={ind}` on an absolutely placed <span class="slide-ind">.
 */
export function useSlideIndicator<T extends HTMLElement = HTMLElement>(axis: "x" | "y", deps: DependencyList) {
  const box = useRef<T>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const place = (instant: boolean) => {
      const b = box.current, i = ind.current;
      if (!b || !i) return;
      const a = b.querySelector<HTMLElement>('[aria-current="page"], [aria-selected="true"], [aria-pressed="true"]');
      if (!a || a.offsetParent !== b) { i.style.opacity = "0"; return; }
      if (instant) i.classList.add("no-anim");
      i.style.opacity = "1";
      if (axis === "x") { i.style.transform = `translateX(${a.offsetLeft}px)`; i.style.width = `${a.offsetWidth}px`; }
      else { i.style.transform = `translateY(${a.offsetTop}px)`; i.style.height = `${a.offsetHeight}px`; }
      if (instant) requestAnimationFrame(() => requestAnimationFrame(() => i.classList.remove("no-anim")));
    };
    place(first.current);
    first.current = false;
    const ro = new ResizeObserver(() => place(true));
    if (box.current) ro.observe(box.current);
    document.fonts?.ready.then(() => place(true)).catch(() => undefined);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { box, ind };
}
