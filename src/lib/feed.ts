import { supabase } from "./supabase";
import type { Shot } from "./media";

// Загрузка и удаление картинок — общие для всех разделов сайта
export { uploadImage, removeImage, type Shot } from "./media";

/* ─────────────────────────── ДАННЫЕ «ЛЕНТЫ» ───────────────────────────

   Один пост — это ФОТО, ТЕКСТ и ДАТА. Ни лайков, ни комментариев, ни
   хештегов: на сайте студии счётчики читались бы как имитация активности.

   Типа поста («композиция» / «фотосессия») намеренно нет: посты бывают
   очень разные — поздравление, закулисье, отзыв, — и любая пара ярлыков
   часть из них не описывает. Дата и заголовок различают посты достаточно.

   Структура плоская и одинаковая с обеих сторон: и вёрстка, и админка
   работают с одним и тем же типом Post. */

export type Post = {
  id: string;
  /** ISO-дата «2026-08-28»: из неё и сортировка, и разметка для поиска */
  date: string;
  /** Короткий заголовок. Без него у поста всего два уровня набора — дата и
      текст, — и лента читается как сплошные абзацы. */
  title: string;
  text: string;
  /** ПОРЯДОК ВАЖЕН: по нему коллаж строит раскладку, и админка позволяет
      его менять стрелками. Первый кадр обычно становится самым крупным. */
  photos: Shot[];
  /** Черновик не виден на сайте, но виден в админке. */
  published: boolean;
  /**
   * Место в ленте: меньше — выше. Порядок ставится руками в админке, потому
   * что дата публикации и важность поста — разные вещи: свежую проходную
   * работу не всегда хочется держать выше удачной прошлогодней.
   *
   * У всех постов сразу после обновления базы здесь ноль, и лента, как и
   * прежде, идёт по дате. Первая же перестановка стрелками нумерует список
   * целиком, и дальше порядок ровно тот, что видно в админке.
   */
  sort: number;
};

/** Пост годится к показу, только если у него есть хотя бы один кадр:
    лента — это витрина работ, а карточка без фотографии не только пуста,
    но и роняла раскладку коллажа. Проверяем и на сайте, и в предпросмотре
    админки. */
export function isRenderablePost(p: Post): boolean {
  return Array.isArray(p.photos) && p.photos.length > 0;
}

/* ─────────────────────────── ПОКАЗАТЕЛЬНЫЕ ПОСТЫ ───────────────────────

   Ими «Лента» живёт, пока база не подключена: страница не должна быть
   пустой ни у того, кто впервые склонировал проект, ни при обрыве сети.
   Как только в базе появятся настоящие посты, эти исчезнут сами. */

const V = (src: string): Shot => ({ src, w: 540, h: 810 }); // вертикальные 2:3
const S = (src: string): Shot => ({ src, w: 540, h: 540 }); // квадратные

const demo: Omit<Post, "sort">[] = [
  {
    id: "demo-1",
    date: "2026-08-28",
    title: "Осень на кирпичной стене",
    text: "Фотозона к первому сентября: кленовые листья, тёплая охра и зелень. Такую собираем и в школу, и в сад — под размер зала и цвета класса.",
    published: true,
    photos: [
      V("/assets/girl_2350_1.webp"),
      V("/assets/girl_2350_2.webp"),
      V("/assets/girl_2350_3.webp"),
    ],
  },
  {
    id: "demo-2",
    date: "2026-08-14",
    title: "Фиолетовый микс",
    text: "Сирень, баклажан и матовое серебро. Эту палитру чаще всего просят для съёмок — она хорошо держится в кадре и не спорит с нарядом.",
    published: true,
    photos: [
      V("/assets/girl_1850_1.webp"),
      V("/assets/girl_1850_2.webp"),
      V("/assets/girl_1850_3.webp"),
      V("/assets/girl_1850_4.webp"),
    ],
  },
  {
    id: "demo-3",
    date: "2026-07-30",
    title: "Мини-фотозона в розовом",
    text: "Занимает меньше двух метров, а кадры получаются как в студии.",
    published: true,
    photos: [V("/assets/women_2650.webp")],
  },
  {
    id: "demo-4",
    date: "2026-07-11",
    title: "Ретро-машинка",
    text: "Для маленького гонщика. Каждую фигуру собираем вручную под размер и цвет — двух одинаковых не бывает.",
    published: true,
    photos: [
      V("/assets/boy_2400_1.webp"),
      S("/assets/boy_2400_2.webp"),
      S("/assets/boy_2400_3.webp"),
    ],
  },
  {
    id: "demo-5",
    date: "2026-06-25",
    title: "Цифра три в розовом",
    text: "Немного золота, много розового и целый вечер восторга.",
    published: true,
    photos: [V("/assets/num_2650_1.webp"), S("/assets/num_2650_2.webp")],
  },
];

/** Порядок — тот, в котором они перечислены выше. */
export const demoPosts: Post[] = demo.map((p, i) => ({ ...p, sort: i }));

/* ─────────────────────────────── ЗАПРОСЫ ─────────────────────────────── */

/**
 * Пустой пост для формы «новая публикация».
 *
 * sort = -1, а не 0: новый пост встаёт ПЕРЕД всеми пронумерованными
 * (те начинаются с нуля) — то есть на самый верх, где его и ждут увидеть.
 * Дальше его можно опустить стрелками.
 */
export function blankPost(): Post {
  return {
    id: "",
    date: new Date().toISOString().slice(0, 10),
    title: "",
    text: "",
    photos: [],
    published: true,
    sort: -1,
  };
}

/* ─────────────────── КОГДА КОЛОНКИ ПОРЯДКА ЕЩЁ НЕТ ───────────────────

   Колонка sort появилась позже остальных, и добавляет её обновлённый
   supabase/schema.sql. Пока его не прогнали, колонки в таблице нет, а
   запрос с сортировкой по ней падает ЦЕЛИКОМ — вместе с лентой на самом
   сайте, а не только в админке. Ронять витрину из-за неприменённой
   миграции нельзя.

   Поэтому один раз ловим именно эту ошибку, запоминаем и дальше работаем
   как раньше: по дате, свежее сверху. Админка при попытке переставить
   посты честно скажет, что нужно сделать. */
let hasSort = true;

const noSortColumn = (e: unknown) => {
  const err = e as { code?: string; message?: string };
  return (
    err?.code === "42703" ||
    /'?sort'? column|column .*sort/i.test(err?.message ?? "")
  );
};

/**
 * Читает посты в том порядке, в каком они стоят в ленте.
 *
 * `null` означает «база не подключена» — это НЕ ошибка и не пустая лента,
 * и вызывающий код по этому различию решает, показывать ли показательные
 * посты.
 */
export async function fetchPosts(withDrafts = false): Promise<Post[] | null> {
  if (!supabase) return null;

  const ask = (withSort: boolean) => {
    const base = supabase!.from("posts").select("*");
    const filtered = withDrafts ? base : base.eq("published", true);
    // Дата — второй ключ, а не запасной: у постов с одинаковым sort
    // (сразу после обновления базы он нулевой у всех) лента остаётся
    // прежней, «свежее сверху».
    const ordered = withSort
      ? filtered.order("sort", { ascending: true })
      : filtered;
    return ordered.order("date", { ascending: false });
  };

  let { data, error } = await ask(hasSort);
  if (error && hasSort && noSortColumn(error)) {
    hasSort = false;
    ({ data, error } = await ask(false));
  }
  if (error) throw error;

  return (data ?? []).map((r) => ({ ...r, sort: r.sort ?? 0 })) as Post[];
}

/** Создаёт или обновляет пост. Возвращает сохранённый — с настоящим id. */
export async function savePost(post: Post): Promise<Post> {
  if (!supabase) throw new Error("База не подключена");

  const row = {
    date: post.date,
    title: post.title.trim(),
    text: post.text.trim(),
    photos: post.photos,
    published: post.published,
    // Пока колонки нет, её нельзя даже упоминать: запись упадёт целиком
    ...(hasSort ? { sort: post.sort ?? 0 } : {}),
  };

  // Без id — это новая публикация; с id — правка существующей.
  const q = post.id
    ? supabase.from("posts").update(row).eq("id", post.id)
    : supabase.from("posts").insert(row);

  const { data, error } = await q.select().single();
  if (error) throw error;
  return data as Post;
}

/**
 * Записывает новый порядок ленты.
 *
 * На вход — весь список в нужном порядке, а не «подняли такой-то».
 * Так проще и надёжнее: номера раздаются заново (0, 1, 2…), и в базу
 * уходят только те посты, у которых номер реально поменялся. При первой
 * же перестановке это весь список, дальше — обычно две записи.
 */
export async function reorderPosts(order: Post[]): Promise<void> {
  if (!supabase) throw new Error("База не подключена");
  if (!hasSort) {
    throw new Error(
      "В таблице постов нет колонки порядка. Прогоните supabase/schema.sql " +
        "в Supabase заново — он её добавит, ничего не потеряв.",
    );
  }

  const writes = order
    .map((p, i) => ({ id: p.id, to: i, from: p.sort }))
    .filter((w) => w.id && w.from !== w.to);

  const results = await Promise.all(
    writes.map((w) =>
      supabase!.from("posts").update({ sort: w.to }).eq("id", w.id),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function deletePost(id: string): Promise<void> {
  if (!supabase) throw new Error("База не подключена");
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}
