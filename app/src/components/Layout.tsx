import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
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
  { path: '/new', label: 'Add', icon: Plus },
  { path: '/gallery', label: 'Gallery', icon: Image },
];
export function Layout() {
  const { dark, toggleTheme } = useTheme();
  const { isDemo } = useRecipes();
  const { profile, session } = useSession();
  const { pathname } = useLocation();
  const prefix = isDemo ? '/demo' : '';
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to recipes
      </a>
      <header className="site-header">
        <Link to={`${prefix}/`} aria-label="Chef GRDN home">
          <Brand />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`${prefix}${path}`}
              end={path === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {dark ? <Sun /> : <Moon />}
          </Button>
          <span className="header-divider" />
          {isDemo || !session ? (
            <Link className="avatar" to="/sign-in" aria-label="Sign in to edit recipes">
              G
            </Link>
          ) : (
            <details className="profile-menu">
              <summary className="avatar" aria-label="Account menu">
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
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>
          <Leaf size={14} /> A little collection. A lot of good food.
        </span>
        <a href="https://www.instagram.com/chef_grdn/" target="_blank" rel="noreferrer">
          @chef_grdn <ArrowUpRight size={14} />
        </a>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={`${prefix}${path}`}
            end={path === '/'}
            className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {isDemo && (
        <div className="preview-banner">
          <span className="preview-dot" />
          Preview · changes stay in this browser
          <Link to="/sign-in">
            Sign in <ArrowUpRight size={12} />
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
