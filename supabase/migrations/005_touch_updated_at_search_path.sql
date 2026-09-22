-- 005_touch_updated_at_search_path.sql
-- Security advisor: "Function Search Path Mutable" on public.touch_updated_at.
-- Pin the function's search_path to an empty string so a caller-controlled
-- search_path cannot resolve objects referenced inside the function body.
-- now() lives in pg_catalog, which is always implicitly searched, so the
-- body needs no other change.
--
-- create or replace keeps the existing projects_touch trigger bound to this
-- function (the trigger references it by OID), so no trigger rebuild is needed.

create or replace function public.touch_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin new.updated_at = now(); return new; end $$;
