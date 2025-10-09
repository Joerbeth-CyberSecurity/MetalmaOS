-- Create table to associate colaboradores to specific products within an OS
create table if not exists public.os_colaboradores_produtos (
    id uuid not null default gen_random_uuid() primary key,
    os_id uuid not null references public.ordens_servico(id) on delete cascade,
    produto_id uuid not null references public.produtos(id),
    colaborador_id uuid not null references public.colaboradores(id),
    data_inicio timestamp with time zone,
    data_fim timestamp with time zone,
    horas_trabalhadas numeric(8,2) default 0,
    ativo boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_ocp_os_id on public.os_colaboradores_produtos(os_id);
create index if not exists idx_ocp_produto_id on public.os_colaboradores_produtos(produto_id);
create index if not exists idx_ocp_colaborador_id on public.os_colaboradores_produtos(colaborador_id);
create index if not exists idx_ocp_ativo on public.os_colaboradores_produtos(ativo);

-- Row Level Security and permissive policies for authenticated users
alter table public.os_colaboradores_produtos enable row level security;

-- Create policies idempotently (CREATE POLICY does not support IF NOT EXISTS)
do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='os_colaboradores_produtos' and policyname='ocp_select_authenticated'
  ) then
    create policy "ocp_select_authenticated"
      on public.os_colaboradores_produtos for select
      to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='os_colaboradores_produtos' and policyname='ocp_insert_authenticated'
  ) then
    create policy "ocp_insert_authenticated"
      on public.os_colaboradores_produtos for insert
      to authenticated with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='os_colaboradores_produtos' and policyname='ocp_update_authenticated'
  ) then
    create policy "ocp_update_authenticated"
      on public.os_colaboradores_produtos for update
      to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='os_colaboradores_produtos' and policyname='ocp_delete_authenticated'
  ) then
    create policy "ocp_delete_authenticated"
      on public.os_colaboradores_produtos for delete
      to authenticated using (true);
  end if;
end $$;

comment on table public.os_colaboradores_produtos is 'Associa colaboradores a produtos específicos dentro de uma OS';
comment on column public.os_colaboradores_produtos.os_id is 'ID da Ordem de Serviço';
comment on column public.os_colaboradores_produtos.produto_id is 'ID do produto específico';
comment on column public.os_colaboradores_produtos.colaborador_id is 'ID do colaborador';


