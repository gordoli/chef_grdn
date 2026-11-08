-- Recipe/review deletion by the owner must also be able to remove associated photos.
create policy "owner removes review photos" on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and public.is_owner());
