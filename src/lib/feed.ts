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

export const demoPosts: Post[] = [
  {
    id: "demo-1",
    date: "2026-08-28",
    title: "Осень на кирпичной стене",
    text: "Фотозона к первому сентября: кленовые листья, тёплая охра и зелень. Такую собираем и в школу, и в сад — под размер зала и цвета класса.",
    published: true,
    photos: [
      V("/assets/girl_2350_1.jpg"),
      V("/assets/girl_2350_2.jpg"),
      V("/assets/girl_2350_3.jpg"),
    ],
  },
  {
    id: "demo-2",
    date: "2026-08-14",
    title: "Фиолетовый микс",
    text: "Сирень, баклажан и матовое серебро. Эту палитру чаще всего просят для съёмок — она хорошо держится в кадре и не спорит с нарядом.",
    published: true,
    photos: [
      V("/assets/girl_1850_1.jpg"),
      V("/assets/girl_1850_2.jpg"),
      V("/assets/girl_1850_3.jpg"),
      V("/assets/girl_1850_4.jpg"),
    ],
  },
  {
    id: "demo-3",
    date: "2026-07-30",
    title: "Мини-фотозона в розовом",
    text: "Занимает меньше двух метров, а кадры получаются как в студии.",
    published: true,
    photos: [V("/assets/women_2650.jpg")],
  },
  {
    id: "demo-4",
    date: "2026-07-11",
    title: "Ретро-машинка",
    text: "Для маленького гонщика. Каждую фигуру собираем вручную под размер и цвет — двух одинаковых не бывает.",
    published: true,
    photos: [
      V("/assets/boy_2400_1.jpg"),
      S("/assets/boy_2400_2.jpg"),
      S("/assets/boy_2400_3.jpg"),
    ],
  },
  {
    id: "demo-5",
    date: "2026-06-25",
    title: "Цифра три в розовом",
    text: "Немного золота, много розового и целый вечер восторга.",
    published: true,
    photos: [V("/assets/num_2650_1.jpg"), S("/assets/num_2650_2.jpg")],
  },
];

/* ─────────────────────────────── ЗАПРОСЫ ─────────────────────────────── */

/** Пустой пост для формы «новая публикация». */
export function blankPost(): Post {
  return {
    id: "",
    date: new Date().toISOString().slice(0, 10),
    title: "",
    text: "",
    photos: [],
    published: true,
  };
}

/**
 * Читает посты, свежие сверху.
 *
 * `null` означает «база не подключена» — это НЕ ошибка и не пустая лента,
 * и вызывающий код по этому различию решает, показывать ли показательные
 * посты.
 */
export async function fetchPosts(withDrafts = false): Promise<Post[] | null> {
  if (!supabase) return null;

  let q = supabase.from("posts").select("*").order("date", { ascending: false });
  if (!withDrafts) q = q.eq("published", true);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Post[];
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
  };

  // Без id — это новая публикация; с id — правка существующей.
  const q = post.id
    ? supabase.from("posts").update(row).eq("id", post.id)
    : supabase.from("posts").insert(row);

  const { data, error } = await q.select().single();
  if (error) throw error;
  return data as Post;
}

export async function deletePost(id: string): Promise<void> {
  if (!supabase) throw new Error("База не подключена");
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}
