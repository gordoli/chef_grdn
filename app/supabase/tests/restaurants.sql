-- Run after 0007 with psql -v ON_ERROR_STOP=1. All fixtures roll back.
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'restaurant-test-one@example.invalid', '{}'),
  ('00000000-0000-0000-0000-000000000002', 'restaurant-test-two@example.invalid', '{}');
insert into public.restaurants (slug, name) values ('restaurant-permission-test', 'Permission test');
set local role anon;
do $$ declare changed integer; begin
  assert (select count(*) = 1 from public.restaurants where slug = 'restaurant-permission-test'), 'Anonymous restaurant browsing';
  begin
    update public.restaurants set notes = 'blocked' where slug = 'restaurant-permission-test';
    get diagnostics changed = row_count;
    assert changed = 0, 'Anonymous update must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.restaurants (slug, name) values ('blocked-anon', 'Blocked');
    raise exception 'Anonymous insert was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.restaurant_reviews;
    raise exception 'Anonymous review read was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare changed integer; begin
  update public.restaurants set rating = 5, status = 'visited' where slug = 'restaurant-permission-test';
  get diagnostics changed = row_count;
  assert changed = 0, 'Friends must not alter the owner rating';
  update public.restaurants set is_favorite = true, locations = '[{"neighborhood":"Blocked"}]' where slug = 'restaurant-permission-test';
  get diagnostics changed = row_count;
  assert changed = 0, 'Friends cannot edit favorites or locations';
  delete from public.restaurants where slug = 'restaurant-permission-test';
  get diagnostics changed = row_count;
  assert changed = 0, 'Friends must not delete restaurants';
  begin
    insert into public.restaurants (slug, name) values ('blocked-friend', 'Blocked');
    raise exception 'Friend insert was accepted';
  exception when insufficient_privilege then null;
  end;
  insert into public.restaurant_reviews (restaurant_id, rating, body)
    select id, 4, 'Friend review' from public.restaurants where slug = 'restaurant-permission-test';
  update public.restaurant_reviews set rating = 4.5, body = 'Friend edit' where author_id = auth.uid();
  get diagnostics changed = row_count;
  assert changed = 1, 'Friends can edit their own review';
  begin
    insert into public.restaurant_reviews (restaurant_id, author_id, rating)
      select id, (select id from public.profiles where role = 'owner' limit 1), 5 from public.restaurants where slug = 'restaurant-permission-test';
    raise exception 'Review impersonation was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$ declare changed integer; begin
  update public.restaurant_reviews set body = 'Blocked edit' where body = 'Friend edit';
  get diagnostics changed = row_count;
  assert changed = 0, 'Friends cannot edit another person review';
  delete from public.restaurant_reviews where body = 'Friend edit';
  get diagnostics changed = row_count;
  assert changed = 0, 'Friends cannot delete another person review';
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true) from public.profiles where role = 'owner' limit 1;
set local role authenticated;
do $$ declare changed integer; begin
  update public.restaurants set status = 'visited', rating = 4.5, visited_on = '2026-11-15', companions = array['Alex', 'Jamie'] where slug = 'restaurant-permission-test';
  get diagnostics changed = row_count;
  assert changed = 1, 'Owner must be able to edit';
  update public.restaurants set is_favorite = true, locations = '[{"neighborhood":"Mission","address":"1 Main St","phone":null,"latitude":37.7,"longitude":-122.4},{"neighborhood":"Pacific Heights","address":"2 Main St","phone":null,"latitude":37.8,"longitude":-122.4}]' where slug = 'restaurant-permission-test';
  assert (select is_favorite and jsonb_array_length(locations) = 2 and rating = 4.5 from public.restaurants where slug = 'restaurant-permission-test'), 'Favorites and multiple locations persist without changing the rating';
  assert (select companions = array['Alex', 'Jamie'] from public.restaurants where slug = 'restaurant-permission-test'), 'Companions persist';
  insert into public.restaurant_reviews (restaurant_id, rating, body) select id, 4.5, 'Good dinner' from public.restaurants where slug = 'restaurant-permission-test';
  begin
    update public.restaurants set status = 'want_to_go' where slug = 'restaurant-permission-test';
    raise exception 'Want-to-go rating was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.restaurants set rating = 6 where slug = 'restaurant-permission-test';
    raise exception 'Invalid rating was accepted';
  exception when check_violation then null;
  end;
  update public.restaurants set status = 'want_to_go', rating = null, visited_on = null where slug = 'restaurant-permission-test';
  delete from public.restaurants where slug = 'restaurant-permission-test';
  assert not exists (select 1 from public.restaurant_reviews where body = 'Good dinner'), 'Reviews cascade on removal';
end $$;
reset role;
rollback;
