-- A restaurant has one collection entry, with independently mapped branches.
alter table public.restaurants add column locations jsonb not null default '[]'
  check (jsonb_typeof(locations) = 'array' and jsonb_array_length(locations) <= 12);
update public.restaurants set locations = jsonb_build_array(jsonb_build_object(
  'neighborhood', coalesce(neighborhood, ''), 'address', address, 'phone', phone,
  'latitude', latitude, 'longitude', longitude
));

-- Combine the two starter Dumpling Story rows without losing personal data or reviews.
do $$
declare mission public.restaurants%rowtype; fillmore public.restaurants%rowtype;
begin
  select * into mission from public.restaurants where slug = 'dumpling-story-valencia' for update;
  select * into fillmore from public.restaurants where slug = 'dumpling-story-fillmore' for update;
  if mission.id is not null and fillmore.id is not null then
    update public.restaurants set
      slug = 'dumpling-story', name = 'Dumpling Story',
      locations = mission.locations || fillmore.locations,
      neighborhood = 'Mission / Pacific Heights',
      is_favorite = mission.is_favorite or fillmore.is_favorite,
      status = case when mission.status = 'visited' or fillmore.status = 'visited' then 'visited' else 'want_to_go' end,
      rating = coalesce(mission.rating, fillmore.rating),
      visited_on = greatest(mission.visited_on, fillmore.visited_on),
      companions = array(select distinct unnest(mission.companions || fillmore.companions)),
      notes = concat_ws(E'\n\n', nullif(mission.notes, ''), case when fillmore.notes <> '' then 'Pacific Heights: ' || fillmore.notes end,
        case when mission.rating is not null and fillmore.rating is not null and mission.rating <> fillmore.rating then 'Pacific Heights rating: ' || fillmore.rating || '/5' end),
      photo_urls = array(select distinct photo from unnest(mission.photo_urls || fillmore.photo_urls) photo limit 12),
      video_urls = array(select distinct video from unnest(mission.video_urls || fillmore.video_urls) video limit 20)
    where id = mission.id;
    insert into public.restaurant_reviews (restaurant_id, author_id, rating, body, visited_on, created_at, updated_at)
      select mission.id, author_id, rating, body, visited_on, created_at, updated_at from public.restaurant_reviews where restaurant_id = fillmore.id
      on conflict (restaurant_id, author_id) do update set body = public.restaurant_reviews.body || E'\n\nPacific Heights (' || excluded.rating || '/5): ' || excluded.body;
    delete from public.restaurants where id = fillmore.id;
  end if;
end $$;
