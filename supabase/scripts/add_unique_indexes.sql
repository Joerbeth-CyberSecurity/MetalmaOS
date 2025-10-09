-- Ensure unique indexes required for UPSERTs and to prevent duplicates

-- os_colaboradores: upsert uses onConflict 'os_id,colaborador_id'
create unique index if not exists ux_os_colaboradores_os_colaborador
on public.os_colaboradores (os_id, colaborador_id);

-- os_colaboradores_produtos: optional but recommended to avoid duplicidade
create unique index if not exists ux_ocp_os_produto_colaborador
on public.os_colaboradores_produtos (os_id, produto_id, colaborador_id);

-- Verify
select indexname, indexdef
from pg_indexes
where schemaname='public' and tablename in ('os_colaboradores','os_colaboradores_produtos')
order by tablename, indexname;


