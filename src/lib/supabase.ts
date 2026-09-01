import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ────────────────────────── ПОДКЛЮЧЕНИЕ К БАЗЕ ──────────────────────────

   Посты «Ленты» и их фотографии лежат в Supabase — это бесплатная облачная
   база с хранилищем файлов. Адрес проекта и публичный ключ приходят из
   переменных окружения (файл .env в корне, см. SUPABASE.md).

   ПУБЛИЧНЫЙ КЛЮЧ МОЖНО ДЕРЖАТЬ В КОДЕ САЙТА. Он так и задуман: любой
   посетитель всё равно видит его в собранном файле. Данные защищает не он,
   а правила доступа на стороне базы (RLS): читать посты может кто угодно,
   а добавлять и править — только вошедший в админку. Секретный ключ
   (service_role) на сайте не используется НИГДЕ.

   Если переменных нет — сайт продолжает работать: «Лента» показывает
   показательные посты из кода, а /admin объясняет, что настроить. Это
   важно, чтобы проект собирался и открывался у любого, кто его склонирует. */

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** База подключена и можно ходить в сеть. */
export const isConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url, key)
  : null;

/** Папка в хранилище, куда складываются снимки постов. */
export const BUCKET = "feed";

/* ───────────────────────── ОШИБКИ ПО-ЧЕЛОВЕЧЕСКИ ─────────────────────────

   Postgres и PostgREST отвечают кодами вроде PGRST205 и 42P01, а в
   интерфейсе от этого толку ноль: «Не удалось прочитать каталог» не
   говорит, что делать. Здесь коды переводятся в понятное действие.

   Самый частый случай — таблицы ещё нет: схему обновляли, а запрос в
   Supabase заново не прогоняли. */
export function explain(e: unknown, what: string): string {
  const err = e as { code?: string; message?: string } | null;
  const code = err?.code ?? "";
  const msg = err?.message ?? "";

  // Таблицы нет в базе
  if (code === "PGRST205" || code === "42P01" || /does not exist|schema cache/i.test(msg)) {
    return `Таблица для раздела «${what}» ещё не создана. Откройте Supabase → SQL Editor и выполните заново файл supabase/schema.sql — он создаёт все три таблицы и не портит уже существующие.`;
  }

  // Колонка не та — схему поменяли, а базу не обновили
  if (code === "42703" || /column .* does not exist/i.test(msg)) {
    return `Строение таблицы «${what}» устарело. Выполните заново supabase/schema.sql в Supabase → SQL Editor: он приведёт её к нужному виду.`;
  }

  // Правила доступа не пустили
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) {
    return `Нет прав на изменение раздела «${what}». Проверьте, что вошли в админку, и выполните заново supabase/schema.sql — он выдаёт права.`;
  }

  // Уникальность
  if (code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    return "Такая запись уже есть — измените поле, которое должно быть уникальным.";
  }

  if (/Failed to fetch|NetworkError/i.test(msg)) {
    return "Нет связи с базой. Проверьте интернет и что проект Supabase не на паузе.";
  }

  return msg || `Не удалось прочитать раздел «${what}»`;
}
