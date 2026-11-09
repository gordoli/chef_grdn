-- Run with psql -v ON_ERROR_STOP=1 after migration 0005. Everything rolls back.
begin;

select public.upsert_recipe('{"slug":"__cooking_status_permission_test__","title":"Status test"}');
do $$ begin
  assert (select cooking_status = 'to_try' from public.recipes
    where slug = '__cooking_status_permission_test__'), 'New recipes must default to to_try';
end $$;

set local role anon;
do $$ declare changed integer; begin
  begin
    update public.recipes set cooking_status = 'made'
      where slug = '__cooking_status_permission_test__';
    get diagnostics changed = row_count;
    assert changed = 0, 'Anonymous visitors must not change cooking status';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare changed integer; begin
  update public.recipes set cooking_status = 'made'
    where slug = '__cooking_status_permission_test__';
  get diagnostics changed = row_count;
  assert changed = 0, 'Non-owners must not change cooking status';
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true)
  from public.profiles where role = 'owner' limit 1;
set local role authenticated;
do $$ declare changed integer; begin
  update public.recipes set cooking_status = 'made'
    where slug = '__cooking_status_permission_test__';
  get diagnostics changed = row_count;
  assert changed = 1, 'The owner must be able to mark recipes as made';
end $$;
reset role;

select public.upsert_recipe('{"slug":"__cooking_status_permission_test__","title":"Edited status test"}');
do $$ begin
  assert (select cooking_status = 'made' from public.recipes
    where slug = '__cooking_status_permission_test__'), 'Recipe edits must preserve cooking status';
  begin
    update public.recipes set cooking_status = 'invalid'
      where slug = '__cooking_status_permission_test__';
    raise exception 'Invalid cooking status was accepted';
  exception when check_violation then null;
  end;
end $$;
rollback;
