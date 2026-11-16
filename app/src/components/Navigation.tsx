'use client';
import { useSlidingIndicator } from '@/hooks/useSlidingIndicator';
import Link from 'next/link';
import { Plus, type LucideIcon } from 'lucide-react';
import { navigationSection } from '@/lib/navigation';
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
  const current = navigationSection(pathname, prefix);
  const { ref: nav, highlight } = useSlidingIndicator<HTMLElement>(
    current,
    '[aria-current="page"]',
  );
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
            className="selection-highlight"
            style={{
              width: highlight.width,
              height: highlight.height,
              transform: `translate3d(${highlight.x}px, ${highlight.y}px, 0)`,
            }}
          />
        )}
        {links.map(({ path, label, icon: Icon }) => {
          const active = path === current;
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
        href={
          current.startsWith('/restaurants') ? `${prefix}/restaurants?add=1` : `${prefix}/?add=1`
        }
        className="glass-control nav-add-bubble"
        aria-label={current.startsWith('/restaurants') ? 'Add restaurant' : 'Add recipe'}
      >
        <Plus strokeWidth={1.65} />
      </Link>
    </div>
  );
}
