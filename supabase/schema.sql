-- ═══════════════════════ БАЗА ДЛЯ «ЛЕНТЫ» ═══════════════════════
--
-- Выполнить ОДИН РАЗ в Supabase: слева «SQL Editor» → «New query» →
-- вставить целиком → «Run».
--
-- Создаёт таблицу постов, папку для снимков и правила доступа.

-- ─────────────────────────── ТАБЛИЦА ───────────────────────────

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  title      text not null default '',
  text       text not null default '',
  -- Массив кадров: [{"src": "...", "w": 1080, "h": 1620, "caption": "..."}]
  -- Порядок важен: по нему строится коллаж на сайте.
  photos     jsonb not null default '[]'::jsonb,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Если таблицу уже создавали с колонкой kind (её убрали — посты бывают
-- слишком разные для пары ярлыков) — этой строкой её можно убрать.
-- Не обязательно: лишняя колонка со значением по умолчанию не мешает.
alter table public.posts drop column if exists kind;

-- Лента всегда читается «свежее сверху» — под этот запрос и индекс.
create index if not exists posts_date_idx on public.posts (date desc);

-- ─────────────────── КТО ЧТО МОЖЕТ С ПОСТАМИ ───────────────────
--
-- Row Level Security: без включённого RLS публичный ключ давал бы
-- любому посетителю право писать в таблицу.

alter table public.posts enable row level security;

-- Читать опубликованное может кто угодно, в том числе не вошедший.
drop policy if exists "посты видны всем" on public.posts;
create policy "посты видны всем"
  on public.posts for select
  using (published = true);

-- Вошедший в админку видит и черновики, и может править что угодно.
drop policy if exists "админ читает всё" on public.posts;
create policy "админ читает всё"
  on public.posts for select
  to authenticated using (true);

drop policy if exists "админ пишет" on public.posts;
create policy "админ пишет"
  on public.posts for insert
  to authenticated with check (true);

drop policy if exists "админ правит" on public.posts;
create policy "админ правит"
  on public.posts for update
  to authenticated using (true) with check (true);

drop policy if exists "админ удаляет" on public.posts;
create policy "админ удаляет"
  on public.posts for delete
  to authenticated using (true);

-- ─────────────────────── ПАПКА ДЛЯ СНИМКОВ ───────────────────────

insert into storage.buckets (id, name, public)
values ('feed', 'feed', true)
on conflict (id) do nothing;

-- Снимки открыты на чтение — иначе их не покажет сайт.
drop policy if exists "снимки видны всем" on storage.objects;
create policy "снимки видны всем"
  on storage.objects for select
  using (bucket_id = 'feed');

-- Загружать, заменять и удалять — только из админки.
drop policy if exists "админ загружает снимки" on storage.objects;
create policy "админ загружает снимки"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'feed');

drop policy if exists "админ заменяет снимки" on storage.objects;
create policy "админ заменяет снимки"
  on storage.objects for update
  to authenticated using (bucket_id = 'feed');

drop policy if exists "админ удаляет снимки" on storage.objects;
create policy "админ удаляет снимки"
  on storage.objects for delete
  to authenticated using (bucket_id = 'feed');
