-- Portfolio visitors can browse recipes and photos. Writes retain owner-only RLS.
create policy "public recipe portfolio" on public.recipes for select to anon using (true);
create policy "public recipe photos" on public.recipe_photos for select to anon using (true);
create policy "public recipe photo objects" on storage.objects for select to anon
  using (bucket_id = 'recipe-photos');
