'use client';
import { useLayoutEffect, useRef, useState } from 'react';

type Highlight = { x: number; y: number; width: number; height: number };

/** One measured selection surface for links and segmented buttons, with an SSR fallback. */
export function useSlidingIndicator<T extends HTMLElement>(activeKey: string, selector: string) {
  const ref = useRef<T>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const active = element.querySelector<HTMLElement>(selector);
      if (!active || !active.offsetWidth || !active.offsetHeight) {
        setHighlight(null);
        return;
      }
      const next = {
        x: active.offsetLeft,
        y: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
      };
      setHighlight((previous) =>
        previous &&
        previous.x === next.x &&
        previous.y === next.y &&
        previous.width === next.width &&
        previous.height === next.height
          ? previous
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const item of element.querySelectorAll('a,button')) observer.observe(item);
    return () => observer.disconnect();
  }, [activeKey, selector]);
  return { ref, highlight };
}
