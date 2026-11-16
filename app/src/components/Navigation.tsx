'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, type LucideIcon } from 'lucide-react';
export type NavigationItem = { path: string; label: string; icon: LucideIcon };
export function Navigation({
  prefix,
  pathname,
  mobile = false,
  links,
}: {
  prefix: string;
  pathname: string;
  mobile?: boolean;
  links: NavigationItem[];
}) {
  const current = pathname.slice(prefix.length) || '/';
  const nav = useRef<HTMLElement>(null);
  const [highlight, setHighlight] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    const measure = () => {
      const active = element.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active || !active.offsetWidth) {
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
        Object.keys(next).every(
          (key) => previous[key as keyof typeof next] === next[key as keyof typeof next],
        )
          ? previous
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const link of element.querySelectorAll('a')) observer.observe(link);
    return () => observer.disconnect();
  }, [current, links]);
  return (
    <div className={mobile ? 'mobile-dock' : 'desktop-dock'}>
      <nav
        ref={nav}
        className={`glass-control ${mobile ? 'mobile-nav' : 'desktop-nav'}`}
        aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}
        data-sliding={highlight ? 'true' : 'false'}
      >
        {highlight && (
          <span
            aria-hidden="true"
            className="navigation-highlight"
            style={{
              width: highlight.width,
              height: highlight.height,
              transform: `translate3d(${highlight.x}px, ${highlight.y}px, 0)`,
            }}
          />
        )}
        {links.map(({ path, label, icon: Icon }) => {
          const active =
            path === '/'
              ? current === '/' || current === '/favorites' || current.startsWith('/r/')
              : current === path || current.startsWith(`${path}/`);
          return (
            <Link
              key={path}
              prefetch={true}
              href={`${prefix}${path}`}
              aria-current={active ? 'page' : undefined}
              className={`${mobile ? 'mobile-nav-link' : 'nav-link'} ${active ? 'active' : ''}`}
            >
              <Icon size={mobile ? 20 : 17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        href={current.startsWith('/restaurants') ? `${prefix}/restaurants?add=1` : `${prefix}/new`}
        className="glass-control nav-add-bubble"
        aria-label={current.startsWith('/restaurants') ? 'Add restaurant' : 'Add recipe'}
      >
        <Plus strokeWidth={1.65} />
      </Link>
    </div>
  );
}
