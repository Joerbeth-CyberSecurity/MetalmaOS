-- Verify extensions
select extname, extversion from pg_extension where extname in ('pgcrypto','uuid-ossp');

-- Verify table exists
select table_schema, table_name from information_schema.tables
where table_schema='public' and table_name='os_colaboradores_produtos';

-- Verify columns
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='os_colaboradores_produtos'
order by ordinal_position;

-- Verify policies (correct column names)
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='os_colaboradores_produtos';


