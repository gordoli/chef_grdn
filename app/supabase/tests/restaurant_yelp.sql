-- Public Yelp metadata follows the restaurant's existing owner-only write boundary.
begin;
insert into auth.users(id,email,raw_user_meta_data) values ('00000000-0000-0000-0000-000000000003','yelp-permission-test@example.invalid','{}');
insert into public.restaurants(slug,name,status,rating,notes) values('yelp-permission-test','Yelp permission test','visited',4.5,'Personal notes');
set local role anon;
do $$ declare changed integer; begin
  assert (select yelp_data = '[]'::jsonb from public.restaurants where slug='yelp-permission-test'), 'External metadata is public';
  begin
    update public.restaurants set yelp_data='[{"rating":1}]', thumbnail_url='https://restaurant.com/anonymous.jpg' where slug='yelp-permission-test';
    get diagnostics changed=row_count;
    assert changed=0, 'Anonymous external metadata writes must be blocked';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $$ declare changed integer; begin
  update public.restaurants set yelp_data='[{"rating":1}]', thumbnail_url='https://restaurant.com/friend.jpg' where slug='yelp-permission-test';
  get diagnostics changed=row_count;
  assert changed=0, 'Friends cannot edit Yelp data';
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true) from public.profiles where role='owner' limit 1;
set local role authenticated;
do $$ declare changed integer; begin
  update public.restaurants set yelp_data='[{"rating":1,"url":"https://www.yelp.com/biz/test"}]' where slug='yelp-permission-test';
  get diagnostics changed=row_count;
  assert changed=1, 'Owner can save external metadata';
  assert (select rating=4.5 and notes='Personal notes' from public.restaurants where slug='yelp-permission-test'), 'Yelp data never overwrites personal fields';
  update public.restaurants set website='https://restaurant.com', yelp_url='https://www.yelp.com/biz/test' where slug='yelp-permission-test';
  assert (select website='https://restaurant.com' and yelp_url='https://www.yelp.com/biz/test' from public.restaurants where slug='yelp-permission-test'), 'Restaurant website and Yelp listing remain separate';
  update public.restaurants set thumbnail_url='https://restaurant.com/selected.jpg' where slug='yelp-permission-test';
  assert (select thumbnail_url='https://restaurant.com/selected.jpg' and rating=4.5 and notes='Personal notes' from public.restaurants where slug='yelp-permission-test'), 'Owner can choose a thumbnail without changing personal fields';
  begin
    update public.restaurants set thumbnail_url='http://restaurant.com/insecure.jpg' where slug='yelp-permission-test';
    raise exception 'Insecure thumbnail accepted';
  exception when check_violation then null;
  end;
  begin
    update public.restaurants set yelp_url='https://yelp.com.evil.com/biz/test' where slug='yelp-permission-test';
    raise exception 'Non-Yelp listing link accepted';
  exception when check_violation then null;
  end;
  begin
    update public.restaurants set yelp_data='{}' where slug='yelp-permission-test';
    raise exception 'Non-array Yelp metadata accepted';
  exception when check_violation then null;
  end;
  begin
    update public.restaurants set yelp_data=(select jsonb_agg('{}'::jsonb) from generate_series(1,13)) where slug='yelp-permission-test';
    raise exception 'Unbounded Yelp metadata accepted';
  exception when check_violation then null;
  end;
end $$;
reset role;
rollback;
