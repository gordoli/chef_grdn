-- Column revokes alone do not override Supabase's default table-level grants.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
grant execute on function public.upsert_recipe(jsonb) to service_role;

create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
alter table public.favorites enable row level security;
create policy "read own favorites" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "add own favorites" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "remove own favorites" on public.favorites for delete to authenticated using (user_id = auth.uid());

create index recipe_photos_recipe_position_idx on public.recipe_photos(recipe_id, position);
create index reviews_recipe_idx on public.reviews(recipe_id);
create index reviews_author_idx on public.reviews(author_id);
