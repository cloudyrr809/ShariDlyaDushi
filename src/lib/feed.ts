import type { Shot } from "../components/ui/Lightbox";
import { supabase, BUCKET } from "./supabase";

/* ─────────────────────────── ДАННЫЕ «ЛЕНТЫ» ───────────────────────────

   Один пост — это ФОТО, ТЕКСТ и ДАТА. Ни лайков, ни комментариев, ни
   хештегов: на сайте студии счётчики читались бы как имитация активности.

   Структура плоская и одинаковая с обеих сторон: и вёрстка, и админка
   работают с одним и тем же типом Post. */

/** Пока два типа. Массив, а не только тип: из него админка строит выбор. */
export const KINDS = ["композиция", "фотосессия"] as const;
export type Kind = (typeof KINDS)[number];

export type Post = {
  id: string;
  /** ISO-дата «2026-08-28»: из неё и сортировка, и разметка для поиска */
  date: string;
  kind: Kind;
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
    kind: "фотосессия",
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
    kind: "композиция",
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
    kind: "фотосессия",
    title: "Мини-фотозона в розовом",
    text: "Занимает меньше двух метров, а кадры получаются как в студии.",
    published: true,
    photos: [V("/assets/women_2650.jpg")],
  },
  {
    id: "demo-4",
    date: "2026-07-11",
    kind: "композиция",
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
    kind: "композиция",
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
    kind: "композиция",
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
    kind: post.kind,
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

/* ─────────────────────────────── СНИМКИ ─────────────────────────────── */

/**
 * Узнаёт размеры кадра ДО отправки.
 *
 * Это не мелочь: на размерах держится вся раскладка коллажа. Если снимать
 * их уже в браузере посетителя, первые мгновения страница считает кадр
 * горизонтальным 3:2 и потом перестраивается — заметный скачок. Здесь же
 * они выясняются один раз при загрузке и уезжают в базу вместе с адресом.
 */
function readSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Не удалось прочитать ${file.name}`));
    };
    img.src = url;
  });
}

/** Кладёт снимок в хранилище и возвращает готовый кадр для поста. */
export async function uploadPhoto(file: File): Promise<Shot> {
  if (!supabase) throw new Error("База не подключена");

  const { w, h } = await readSize(file);

  /* Имя файла придумываем сами, а не берём исходное: у снимков с телефона
     они повторяются (IMG_0001.jpg), и второй затёр бы первый. */
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { src: data.publicUrl, w, h };
}

/** Убирает файл из хранилища, чтобы удалённые кадры не копились впустую. */
export async function removePhoto(src: string): Promise<void> {
  if (!supabase) return;
  const at = src.indexOf(`/${BUCKET}/`);
  if (at === -1) return; // не наш файл — например, снимок из папки assets
  const path = src.slice(at + BUCKET.length + 2);
  await supabase.storage.from(BUCKET).remove([path]);
}
