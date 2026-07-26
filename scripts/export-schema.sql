-- Generates a best-effort schema reconstruction of the public schema
-- (tables, constraints, indexes, RLS policies, functions) without needing
-- pg_dump/Docker. Run with:
--   npx supabase db query --file scripts/export-schema.sql --linked --output json > /tmp/out.json
-- then extract the `full_schema` field from rows[0] (see scripts/export-schema.js).
-- See supabase/schema_baseline_reference.sql for caveats on what this misses.

with cols as (
  select
    c.table_name,
    string_agg(
      format(
        '  %I %s%s%s',
        c.column_name,
        case
          when c.data_type = 'ARRAY' then
            (select e.data_type from information_schema.element_types e
             where e.object_catalog = c.table_catalog
               and e.object_schema = c.table_schema
               and e.object_name = c.table_name
               and e.object_type = 'TABLE'
               and e.collection_type_identifier = c.dtd_identifier) || '[]'
          when c.data_type = 'USER-DEFINED' then c.udt_name
          when c.data_type = 'character varying' and c.character_maximum_length is not null
            then 'varchar(' || c.character_maximum_length || ')'
          else c.data_type
        end,
        case when c.is_nullable = 'NO' then ' NOT NULL' else '' end,
        case when c.column_default is not null then ' DEFAULT ' || c.column_default else '' end
      ),
      E',\n' order by c.ordinal_position
    ) as cols_sql
  from information_schema.columns c
  where c.table_schema = 'public'
    and exists (
      select 1 from information_schema.tables t
      where t.table_schema = 'public' and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    )
  group by c.table_name
),
tables_sql as (
  select
    table_name,
    format(E'-- ============================================\ncreate table if not exists public.%I (\n%s\n);\n', table_name, cols_sql) as sql
  from cols
),
constraints_sql as (
  select
    conrelid::regclass::text as table_name,
    string_agg(
      format('alter table %s add constraint %I %s;', conrelid::regclass, conname, pg_get_constraintdef(oid)),
      E'\n' order by conname
    ) as sql
  from pg_constraint
  where connamespace = 'public'::regnamespace
  group by conrelid
),
indexes_sql as (
  select
    tablename as table_name,
    string_agg(indexdef || ';', E'\n' order by indexname) as sql
  from pg_indexes
  where schemaname = 'public'
    and indexname not in (select conname from pg_constraint where connamespace = 'public'::regnamespace)
  group by tablename
),
policies_sql as (
  select
    tablename as table_name,
    string_agg(
      format(
        'create policy %I on public.%I for %s to %s%s%s;',
        policyname, tablename, cmd,
        array_to_string(roles, ', '),
        case when qual is not null then format(' using (%s)', qual) else '' end,
        case when with_check is not null then format(' with check (%s)', with_check) else '' end
      ),
      E'\n' order by policyname
    ) as sql
  from pg_policies
  where schemaname = 'public'
  group by tablename
),
rls_sql as (
  select
    relname as table_name,
    format('alter table public.%I enable row level security;', relname) as sql
  from pg_class
  where relnamespace = 'public'::regnamespace
    and relrowsecurity = true
    and relkind = 'r'
),
functions_sql as (
  select string_agg(pg_get_functiondef(p.oid) || ';', E'\n\n' order by p.proname) as sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select string_agg(
  t.sql
    || coalesce(E'\n' || rl.sql || E'\n', '')
    || coalesce(E'\n' || c.sql || E'\n', '')
    || coalesce(E'\n' || i.sql || E'\n', '')
    || coalesce(E'\n' || p.sql || E'\n', ''),
  E'\n\n' order by t.table_name
) || E'\n\n-- ============================================\n-- FUNCTIONS\n-- ============================================\n\n' || (select sql from functions_sql)
as full_schema
from tables_sql t
left join constraints_sql c on c.table_name = t.table_name
left join indexes_sql i on i.table_name = t.table_name
left join policies_sql p on p.table_name = t.table_name
left join rls_sql rl on rl.table_name = t.table_name;
