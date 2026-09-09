-- Tabla simple para registrar conversaciones recibidas por /api/zernio-webhook.
-- Ejecutar en Supabase SQL Editor si la tabla public.conversations no existe.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  message text not null,
  response text not null,
  timestamp timestamptz not null default now()
);

create index if not exists conversations_phone_idx on public.conversations (phone);
create index if not exists conversations_timestamp_idx on public.conversations (timestamp desc);

alter table public.conversations enable row level security;

-- El webhook escribe desde el backend con la anon key configurada en Render.
-- Ajusta esta política si quieres restringirlo más o migrar a service_role solo en backend.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conversations'
      and policyname = 'Allow webhook inserts with anon key'
  ) then
    create policy "Allow webhook inserts with anon key"
      on public.conversations
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;
