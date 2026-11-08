'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, BookOpen, Heart, Image, Plus, Sun, Moon, LogOut, Leaf } from 'lucide-react';
import { Button } from './ui/button';
import { Brand } from './Brand';
import { useTheme } from '@/hooks/useTheme';
import { useRecipes } from '@/hooks/useRecipes';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
const links = [
  { path: '/', label: 'Recipes', icon: BookOpen },
  { path: '/favorites', label: 'Favorites', icon: Heart },
  { path: '/gallery', label: 'Gallery', icon: Image },
];
function Navigation({
  prefix,
  pathname,
  mobile = false,
}: {
  prefix: string;
  pathname: string;
  mobile?: boolean;
}) {
  const current = pathname.slice(prefix.length) || '/';
  return (
    <div className={mobile ? 'mobile-dock' : 'desktop-dock'}>
      <nav
        className={`glass-control ${mobile ? 'mobile-nav' : 'desktop-nav'}`}
        aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}
      >
        {links.map(({ path, label, icon: Icon }) => {
          const active =
            path === '/' ? current === '/' || current.startsWith('/r/') : current === path;
          return (
            <Link
              key={path}
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
      <Link href={`${prefix}/new`} className="glass-control nav-add-bubble" aria-label="Add recipe">
        <Plus strokeWidth={1.65} />
      </Link>
    </div>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { dark, toggleTheme } = useTheme();
  const { isDemo } = useRecipes();
  const { profile, session } = useSession();
  const pathname = usePathname();
  const prefix = isDemo ? '/demo' : '';
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to recipes
      </a>
      <header className="site-header">
        <Link href={`${prefix}/`} aria-label="Chef GRDN home">
          <Brand />
        </Link>
        <Navigation prefix={prefix} pathname={pathname} />
        <div className="header-actions">
          <Button
            className="glass-control theme-toggle"
            variant="ghost"
            size="icon"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          {isDemo || !session ? (
            <Link
              className="avatar glass-control"
              href="/sign-in"
              aria-label="Sign in to edit recipes"
            >
              G
            </Link>
          ) : (
            <details className="profile-menu">
              <summary className="avatar glass-control" aria-label="Account menu">
                {profile?.display_name.slice(0, 1).toUpperCase() ?? 'G'}
              </summary>
              <div className="account-dropdown">
                <p>{profile?.display_name}</p>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void supabase?.auth
                      .signOut()
                      .catch(() => toast.error('Could not sign out. Try again.'))
                  }
                >
                  <LogOut />
                  Sign out
                </Button>
              </div>
            </details>
          )}
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <span>
          <Leaf size={14} /> A little collection. A lot of good food.
        </span>
        <a href="https://www.instagram.com/chef_grdn/" target="_blank" rel="noreferrer">
          @chef_grdn
          <ArrowUpRight size={14} />
        </a>
      </footer>
      <Navigation prefix={prefix} pathname={pathname} mobile />
      {isDemo && (
        <div className="preview-banner">
          <span className="preview-dot" />
          Preview · changes stay in this browser
          <Link href="/sign-in">
            Sign in
            <ArrowUpRight size={12} />
          </Link>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {pathname.includes('favorites')
          ? 'Favorites'
          : pathname.includes('gallery')
            ? 'Gallery'
            : 'Recipe book'}
      </span>
    </div>
  );
}
