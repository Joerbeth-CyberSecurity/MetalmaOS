-- Enable required extensions (safe if already enabled)
create extension if not exists pgcrypto with schema public;
create extension if not exists "uuid-ossp" with schema public;

-- Quick check
select extname, extversion from pg_extension where extname in ('pgcrypto','uuid-ossp');


