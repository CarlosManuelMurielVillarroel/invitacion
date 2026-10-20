-- Ejecuta todo este archivo en Supabase > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  invite_token text not null unique,
  max_ceremony_companions integer not null default 0 check (max_ceremony_companions between 0 and 20),
  max_party_companions integer not null default 0 check (max_party_companions between 0 and 20),
  ceremony_status text not null default 'pending' check (ceremony_status in ('pending','accepted','declined')),
  ceremony_companions integer not null default 0 check (ceremony_companions between 0 and 20),
  party_status text not null default 'pending' check (party_status in ('pending','accepted','declined')),
  party_companions integer not null default 0 check (party_companions between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_settings (
  id integer primary key check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_invitation_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()); $$;

alter table public.guests enable row level security;
alter table public.event_settings enable row level security;
alter table public.admins enable row level security;

-- Solo usuarios que hayas agregado a public.admins pueden gestionar estos datos.
drop policy if exists "Admins manage guests" on public.guests;
create policy "Admins manage guests" on public.guests for all to authenticated
using (public.is_invitation_admin()) with check (public.is_invitation_admin());

drop policy if exists "Admins manage event settings" on public.event_settings;
create policy "Admins manage event settings" on public.event_settings for all to authenticated
using (public.is_invitation_admin()) with check (public.is_invitation_admin());

drop policy if exists "Admins read admin list" on public.admins;
create policy "Admins read admin list" on public.admins for select to authenticated
using (public.is_invitation_admin());

-- La página pública NO lee las tablas directamente. La Edge Function usa la clave
-- service_role solo en el servidor y devuelve únicamente los campos necesarios.
insert into public.event_settings (id, settings) values (1, '{
  "graduate_name":"Paola García Olguin",
  "university":"UNIVERSIDAD LATINOAMERICANA ULAT",
  "ceremony_date_text":"Sábado, 24 de octubre de 2026",
  "ceremony_time":"14:30 h",
  "venue":"Auditorio “U.E. LATINOAMERICANA”",
  "address":"Av. Rubén Ferrufino, zona Saca Saca",
  "map_url":"https://www.google.com/maps/search/?api=1&query=Av.+Ruben+Ferrufino+zona+Saca+Saca+Bolivia",
  "photo_url":"",
  "celebration_text":"Los detalles de la celebración posterior se comunicarán más adelante.",
  "celebration_details":"Detalles por confirmar",
  "music_url":""
}'::jsonb) on conflict (id) do nothing;
