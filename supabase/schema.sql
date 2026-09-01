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

-- ═════════════════ ТОВАРЫ КАТАЛОГА И УСЛУГИ ═════════════════
--
-- Устроены так же, как посты: своя таблица, тот же набор правил доступа.
-- Обе можно выполнять повторно — ничего не потеряется.

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  -- NULL — карточка вне категорий: видна только во вкладке «Все».
  category_id text,
  title       text not null default '',
  price       integer not null default 0,
  old_price   integer,
  images      jsonb not null default '[]'::jsonb,
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists products_cat_idx on public.products (category_id);

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  -- Короткое латинское имя для якоря в адресе (/services#photosessions).
  key         text not null unique,
  title       text not null default '',
  time        text,
  price       integer not null default 0,
  format      text,
  short_desc  text,
  paragraphs  jsonb not null default '[]'::jsonb,
  includes    jsonb not null default '[]'::jsonb,
  images      jsonb not null default '[]'::jsonb,
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Правила те же, что у постов: читают опубликованное все, пишет админ.
-- Цикл, чтобы не повторять восемь почти одинаковых policy руками.
do $$
declare t text;
begin
  foreach t in array array['products', 'services'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "видно всем" on public.%I', t);
    execute format(
      'create policy "видно всем" on public.%I for select using (published = true)', t);

    execute format('drop policy if exists "админ читает всё" on public.%I', t);
    execute format(
      'create policy "админ читает всё" on public.%I for select to authenticated using (true)', t);

    execute format('drop policy if exists "админ пишет" on public.%I', t);
    execute format(
      'create policy "админ пишет" on public.%I for insert to authenticated with check (true)', t);

    execute format('drop policy if exists "админ правит" on public.%I', t);
    execute format(
      'create policy "админ правит" on public.%I for update to authenticated using (true) with check (true)', t);

    execute format('drop policy if exists "админ удаляет" on public.%I', t);
    execute format(
      'create policy "админ удаляет" on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;

-- ─────────────────────── ПАПКА ДЛЯ СНИМКОВ ───────────────────────
--
-- Одна на весь сайт: посты, товары и услуги. Имена файлов случайные и не
-- пересекаются, а описывать правила для каждой папки отдельно незачем.

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
