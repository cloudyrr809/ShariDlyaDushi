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

-- Порядок постов в ленте, выставляемый стрелками в админке: меньше — выше.
-- Ноль у всех сразу после добавления колонки, и до первой перестановки
-- лента идёт как раньше — по дате.
alter table public.posts add column if not exists sort integer not null default 0;

-- Лента читается «по порядку, внутри порядка — свежее сверху»: индекс
-- составной, ровно под этот запрос.
create index if not exists posts_order_idx on public.posts (sort, date desc);

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
  -- Список разделов, а не один: композиция часто подходит сразу
  -- нескольким, и с одной колонкой её пришлось бы заводить дважды.
  -- Пустой список — карточка видна только во вкладке «Все».
  categories  jsonb not null default '[]'::jsonb,
  title       text not null default '',
  price       integer not null default 0,
  old_price   integer,
  images      jsonb not null default '[]'::jsonb,
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Описание и характеристики карточки — для окна «Подробнее».
-- specs: [{"name": "Состав", "value": "12 латексных шаров"}, ...]
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists specs jsonb not null default '[]'::jsonb;

-- Если таблицу успели создать с одиночной колонкой category_id —
-- переносим её значение в список и убираем. Повторный запуск безвреден.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'products'
               and column_name = 'category_id') then
    alter table public.products
      add column if not exists categories jsonb not null default '[]'::jsonb;
    update public.products
       set categories = jsonb_build_array(category_id)
     where category_id is not null and categories = '[]'::jsonb;
    alter table public.products drop column category_id;
  end if;
end $$;

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

-- Акции. Проценты, суммы и условия меняются чаще всего остального на
-- сайте, поэтому лежат в базе, а не в коде.
--
-- icon и art — не произвольные значения, а ключ значка и путь к одному из
-- шести PNG с шарами: у каждого файла свои замеренные поля кадра, и
-- посторонняя картинка растянулась бы по одной оси. Выбор ограничен
-- списком в самой админке.
create table if not exists public.promotions (
  id          uuid primary key default gen_random_uuid(),
  hero        text not null default '',
  hero_sub    text not null default '',
  vertical    text not null default '',
  title       text not null default '',
  descr       text not null default '',
  cond        text not null default '',
  icon        text not null default 'gift',
  art         text not null default '/assets/ballon1.png',
  art_scale   real not null default 1,
  sort        integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Условия работы студии: доставка, оплата, возврат, памятка по уходу.
-- ОДНА строка с постоянным ключом 'main' — это правила студии, а не
-- свойство отдельного товара. Каждое поле — массив абзацев.
create table if not exists public.settings (
  id         text primary key default 'main',
  delivery   jsonb not null default '[]'::jsonb,
  payment    jsonb not null default '[]'::jsonb,
  returns    jsonb not null default '[]'::jsonb,
  care       jsonb not null default '[]'::jsonb,
  -- Кнопка и строка о предложении на первом экране главной
  hero_cta     text not null default 'Выбрать композицию',
  hero_cta_to  text not null default '/catalog',
  hero_note    text not null default '',
  updated_at timestamptz not null default now()
);

-- Если таблицу успели создать до появления этих трёх полей
alter table public.settings add column if not exists hero_cta text not null default 'Выбрать композицию';
alter table public.settings add column if not exists hero_cta_to text not null default '/catalog';
alter table public.settings add column if not exists hero_note text not null default '';

-- У условий нет черновиков: они либо есть, либо показываются
-- значения по умолчанию из кода. Поэтому правило чтения своё —
-- «видно всем без оговорок», а не общее по колонке published.
alter table public.settings enable row level security;

drop policy if exists "условия видны всем" on public.settings;
create policy "условия видны всем"
  on public.settings for select using (true);

drop policy if exists "админ пишет условия" on public.settings;
create policy "админ пишет условия"
  on public.settings for insert to authenticated with check (true);

drop policy if exists "админ правит условия" on public.settings;
create policy "админ правит условия"
  on public.settings for update to authenticated using (true) with check (true);

-- Правила те же, что у постов: читают опубликованное все, пишет админ.
-- Цикл, чтобы не повторять почти одинаковые policy руками.
do $$
declare t text;
begin
  foreach t in array array['products', 'services', 'promotions'] loop
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
