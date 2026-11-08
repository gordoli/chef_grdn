'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Camera, Instagram, Plus } from 'lucide-react';
import { useRecipes } from '@/hooks/useRecipes';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
export function Gallery() {
  const { recipes, isDemo, canEdit } = useRecipes();
  const [active, setActive] = useState<string | null>(null);
  const [instagram, setInstagram] = useState(false);
  const photos = recipes.flatMap((r) => r.photos.map((p) => ({ ...p, recipe: r })));
  const photo = photos.find((p) => p.id === active);
  return (
    <div className="gallery-page page-width">
      <div className="gallery-heading">
        <div>
          <span className="eyebrow">A VISUAL DIARY</span>
          <h1>
            From the kitchen<span>.</span>
          </h1>
          <p>The meals, the moments, and everything in between.</p>
        </div>
        <a
          className="instagram-profile-link"
          href="https://www.instagram.com/chef_grdn/"
          target="_blank"
          rel="noreferrer"
        >
          <Instagram size={20} />
          <span>@chef_grdn</span>
          <ArrowUpRight size={17} />
        </a>
      </div>
      <div className="gallery-section-heading">
        <h2>
          On the camera roll <span>{photos.length}</span>
        </h2>
        <span>GOOD FOOD, GOOD MEMORIES</span>
      </div>
      {photos.length ? (
        <div className="gallery-grid">
          {photos.map((p) => (
            <button key={p.id} className="gallery-tile" onClick={() => setActive(p.id)}>
              <img src={p.url} alt={p.caption ?? p.recipe.title} loading="lazy" />
              <span>
                <strong>{p.recipe.title}</strong>
                <small>{p.caption}</small>
                <ArrowUpRight size={20} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="A little space for the good stuff.">
          <p>Photos you add to your recipes will find a home here.</p>
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`${isDemo ? '/demo' : ''}/`}>
                <Camera />
                Add photos to a recipe
              </Link>
            </Button>
          )}
        </EmptyState>
      )}
      <section className="instagram-section">
        <div className="instagram-copy">
          <span className="eyebrow">OUTSIDE THE RECIPE BOOK</span>
          <Instagram size={34} strokeWidth={1.3} />
          <h2>
            A little more
            <br />
            from my kitchen.
          </h2>
          <p>What’s cooking, what I’m trying, and the occasional happy accident.</p>
          <a href="https://www.instagram.com/chef_grdn/" target="_blank" rel="noreferrer">
            Follow @chef_grdn <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="instagram-embed">
          {instagram ? (
            <>
              <iframe
                title="Chef GRDN on Instagram"
                src="https://www.instagram.com/chef_grdn/embed/"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="encrypted-media"
              />
              <p>
                Instagram not loading?{' '}
                <a href="https://www.instagram.com/chef_grdn/" target="_blank" rel="noreferrer">
                  Open the profile <ArrowUpRight size={12} />
                </a>
              </p>
            </>
          ) : (
            <div className="instagram-placeholder">
              <div className="instagram-grid-art" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <span key={i} />
                ))}
              </div>
              <Button variant="outline" onClick={() => setInstagram(true)}>
                <Plus />
                Load Instagram
              </Button>
              <small>View the public profile here.</small>
            </div>
          )}
        </div>
      </section>
      {photo && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setActive(null);
          }}
        >
          <DialogContent className="gallery-lightbox">
            <img src={photo.url} alt={photo.caption ?? photo.recipe.title} />
            <div>
              <DialogTitle>{photo.recipe.title}</DialogTitle>
              <DialogDescription>
                {photo.caption || 'From the Chef GRDN kitchen.'}
              </DialogDescription>
              <Button asChild variant="outline">
                <Link href={`${isDemo ? '/demo' : ''}/r/${photo.recipe.slug}`}>
                  View recipe
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
