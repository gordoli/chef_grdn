'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  Image,
  Plus,
  Sun,
  Moon,
  LogOut,
  LogIn,
  Leaf,
  Utensils,
  Search,
  Settings,
} from 'lucide-react';
import { Button } from './ui/button';
import { Brand } from './Brand';
import { KitchenToolsIcon } from './icons/KitchenToolsIcon';
import { CollectionSearchContext } from '@/hooks/useCollectionSearch';
import { useTheme } from '@/hooks/useTheme';
import { useRecipes } from '@/hooks/useRecipes';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
const links = [
  { path: '/', label: 'Recipes', icon: BookOpen },
  { path: '/gallery', label: 'Gallery', icon: Image },
  { path: '/restaurants', label: 'Restaurants', icon: Utensils },
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
            path === '/'
              ? current === '/' || current === '/favorites' || current.startsWith('/r/')
              : current === path || current.startsWith(`${path}/`);
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
export function Layout({ children }: { children: ReactNode }) {
  const { dark, toggleTheme } = useTheme();
  const { isDemo } = useRecipes();
  const { profile, session } = useSession();
  const pathname = usePathname();
  const prefix = isDemo ? '/demo' : '';
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const settingsMenu = useRef<HTMLDetailsElement>(null);
  const current = pathname.slice(prefix.length) || '/';
  const isRestaurantSection = current === '/restaurants' || current.startsWith('/restaurants/');
  const isRestaurantCollection = current === '/restaurants';
  const isCollection = current === '/' || current === '/favorites' || isRestaurantCollection;
  useEffect(() => {
    setSearch('');
    setSearchOpen(false);
  }, [isRestaurantSection]);
  useEffect(() => {
    if (!isCollection) {
      setSearchOpen(false);
      setSearch('');
    }
    if (settingsMenu.current) settingsMenu.current.open = false;
  }, [pathname, isCollection]);
  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (!settingsMenu.current?.contains(event.target as Node) && settingsMenu.current)
        settingsMenu.current.open = false;
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && settingsMenu.current?.open) {
        settingsMenu.current.open = false;
        settingsMenu.current.querySelector('summary')?.focus();
      }
    }
    document.addEventListener('click', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  return (
    <CollectionSearchContext.Provider
      value={{ search, setSearch, searchOpen, setSearchOpen, searchToggle }}
    >
      <div className="app-shell">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <Link href={`${prefix}/`} aria-label="Chef GRDN home">
            <Brand />
          </Link>
          <Navigation prefix={prefix} pathname={pathname} />
          <div className="header-actions">
            <Button
              ref={searchToggle}
              className="glass-control header-bubble recipe-search-toggle"
              variant="ghost"
              size="icon"
              aria-label={
                isRestaurantSection
                  ? searchOpen
                    ? 'Close restaurant search'
                    : 'Search restaurants'
                  : searchOpen
                    ? 'Close recipe search'
                    : 'Search recipes'
              }
              aria-expanded={searchOpen}
              aria-controls={
                isCollection
                  ? isRestaurantCollection
                    ? 'restaurant-search'
                    : 'recipe-search'
                  : undefined
              }
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearch('');
                if (!isCollection)
                  router.push(isRestaurantSection ? `${prefix}/restaurants` : `${prefix}/`);
              }}
            >
              <Search />
            </Button>
            <Link
              className="glass-control header-bubble"
              href={`${prefix}/basics`}
              aria-label="Kitchen basics"
              aria-current={current === '/basics' ? 'page' : undefined}
            >
              <KitchenToolsIcon />
            </Link>
            <details ref={settingsMenu} className="profile-menu">
              <summary className="header-bubble glass-control" aria-label="Settings">
                <Settings />
              </summary>
              <div className="account-dropdown">
                {session && <p>{profile?.display_name}</p>}
                <Button
                  variant="ghost"
                  aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                  onClick={toggleTheme}
                >
                  {dark ? <Sun /> : <Moon />}
                  {dark ? 'Light mode' : 'Dark mode'}
                </Button>
                {isDemo || !session ? (
                  <Button asChild variant="ghost">
                    <Link href="/sign-in">
                      <LogIn />
                      Sign in
                    </Link>
                  </Button>
                ) : (
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
                )}
              </div>
            </details>
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
          {pathname.includes('restaurants')
            ? 'Restaurants'
            : pathname.includes('favorites')
              ? 'Favorites'
              : pathname.includes('gallery')
                ? 'Gallery'
                : pathname.includes('basics')
                  ? 'Kitchen basics'
                  : 'Recipe book'}
        </span>
      </div>
    </CollectionSearchContext.Provider>
  );
}
