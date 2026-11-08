-- Chef GRDN initial schema
-- Run once in the Supabase SQL editor, or with `supabase db push`.
-- Order matters: tables + RLS, then Storage buckets + policies, then the upsert function Claude uses.

-- 1. Tables, profile trigger, owner check, row-level security
-- profiles: one row per signed-in person
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  role text not null default 'friend' check (role in ('owner', 'friend')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
$$;

-- recipes
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  type text not null default 'Mains',          -- Mains, Soups, ... (free text, new types appear as sections)
  tags text[] not null default '{}',
  servings numeric,                            -- base serving count for scaling; null = use multipliers
  yield_label text,                            -- 'Serves 2-3 (or 4 lighter portions)', 'Big 2 lb batch'
  time_label text,                             -- 'About 45 min'
  intro text,
  source_url text,                             -- TikTok, blog, video
  source_label text,                           -- 'Morgan Beth (@morganbeth_)'
  notion_url text,
  ingredients jsonb not null default '[]',     -- see Portion scaling for the shape
  steps jsonb not null default '[]',           -- [{"section": "Make the glaze", "steps": ["..."]}]
  notes text[] not null default '{}',
  cover_photo_id uuid,
  sort_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- photos
create table public.recipe_photos (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes on delete cascade,
  storage_path text not null,                  -- '<recipe id>/<uuid>.jpg' in the recipe-photos bucket
  caption text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.recipes add constraint recipes_cover_fk
  foreign key (cover_photo_id) references public.recipe_photos on delete set null;

-- reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  made_on date,
  photo_path text,                             -- optional, in the review-photos bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, author_id)                -- one review per friend per recipe, editable
);

-- row-level security
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_photos enable row level security;
alter table public.reviews enable row level security;

create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update (role) on public.profiles from authenticated;   -- nobody promotes themselves

create policy "read recipes" on public.recipes for select to authenticated using (true);
create policy "owner writes recipes" on public.recipes for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy "read photos" on public.recipe_photos for select to authenticated using (true);
create policy "owner writes photos" on public.recipe_photos for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy "read reviews" on public.reviews for select to authenticated using (true);
create policy "write own review" on public.reviews for insert to authenticated
  with check (author_id = auth.uid());
create policy "edit own review" on public.reviews for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own or as owner" on public.reviews for delete to authenticated
  using (author_id = auth.uid() or public.is_owner());

-- 2. Storage buckets and policies
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', false),
       ('review-photos', 'review-photos', false);

create policy "signed-in can view photos" on storage.objects for select to authenticated
  using (bucket_id in ('recipe-photos', 'review-photos'));

create policy "owner adds recipe photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-photos' and public.is_owner());
create policy "owner removes recipe photos" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-photos' and public.is_owner());

create policy "friends add own review photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "friends remove own review photos" on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. upsert_recipe: the single write path Claude uses (also used by scripts/seed.ts)
create function public.upsert_recipe(r jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  insert into public.recipes as t (
    slug, title, type, tags, servings, yield_label, time_label, intro,
    source_url, source_label, notion_url, ingredients, steps, notes, sort_order)
  values (
    r->>'slug', r->>'title', coalesce(r->>'type', 'Mains'),
    coalesce(array(select jsonb_array_elements_text(r->'tags')), '{}'),
    (r->>'servings')::numeric, r->>'yield_label', r->>'time_label', r->>'intro',
    r->>'source_url', r->>'source_label', r->>'notion_url',
    coalesce(r->'ingredients', '[]'), coalesce(r->'steps', '[]'),
    coalesce(array(select jsonb_array_elements_text(r->'notes')), '{}'),
    (select coalesce(max(sort_order), 0) + 1 from public.recipes))
  on conflict (slug) do update set
    title = excluded.title, type = excluded.type, tags = excluded.tags,
    servings = excluded.servings, yield_label = excluded.yield_label,
    time_label = excluded.time_label, intro = excluded.intro,
    source_url = excluded.source_url, source_label = excluded.source_label,
    notion_url = coalesce(excluded.notion_url, t.notion_url),
    ingredients = excluded.ingredients, steps = excluded.steps, notes = excluded.notes,
    updated_at = now()
  returning id into rid;
  return rid;
end $$;

-- not callable from the browser; only through the dashboard / connector
revoke execute on function public.upsert_recipe(jsonb) from public, anon, authenticated;
