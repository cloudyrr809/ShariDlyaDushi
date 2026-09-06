import { supabase } from "./supabase";
import { reviews as constReviews } from "../constants";

/* ────────────────────────────── ОТЗЫВЫ ──────────────────────────────

   До сих пор отзывы лежали в constants.ts, то есть менялись только
   правкой кода. А приходят они чаще всего остального: человек написал во
   ВКонтакте — его надо перенести на сайт в тот же день.

   Устройство ровно как у акций (lib/promotions.ts): таблица в базе,
   запасной список в коде на случай пустой таблицы, разовый перенос
   кнопкой в админке.

   ФОТОГРАФИИ ХРАНИМ МАССИВОМ АДРЕСОВ, а не одной строкой: у отзыва их
   бывает несколько, и карточка листает их своей каруселью. */

export type Review = {
  id: string;
  text: string;
  author: string;
  /** Подпись под именем: «Клиент студии», «Постоянный клиент студии». */
  role: string;
  photos: string[];
  sort: number;
  published: boolean;
};

export function blankReview(): Review {
  return {
    id: "",
    text: "",
    author: "",
    role: "Клиент студии",
    photos: [],
    sort: 0,
    published: true,
  };
}

type Row = {
  id: string;
  text: string | null;
  author: string | null;
  role: string | null;
  photos: string[] | null;
  sort: number | null;
  published: boolean;
};

const fromRow = (r: Row): Review => ({
  id: r.id,
  text: r.text ?? "",
  author: r.author ?? "",
  role: r.role ?? "",
  // jsonb может прийти чем угодно, если строку правили руками в базе
  photos: Array.isArray(r.photos) ? r.photos.filter((p) => !!p) : [],
  sort: r.sort ?? 0,
  published: r.published,
});

const toRow = (r: Review) => ({
  text: r.text.trim(),
  author: r.author.trim(),
  role: r.role.trim(),
  photos: r.photos.filter((p) => !!p && p.trim()),
  sort: r.sort ?? 0,
  published: r.published,
});

export async function fetchReviews(
  withDrafts = false,
): Promise<Review[] | null> {
  if (!supabase) return null;

  let q = supabase
    .from("reviews")
    .select("*")
    .order("sort", { ascending: true });
  if (!withDrafts) q = q.eq("published", true);

  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function saveReview(r: Review): Promise<Review> {
  if (!supabase) throw new Error("База не подключена");
  const row = toRow(r);
  const q = r.id
    ? supabase.from("reviews").update(row).eq("id", r.id)
    : supabase.from("reviews").insert(row);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteReview(id: string): Promise<void> {
  if (!supabase) throw new Error("База не подключена");
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}

/** Переносит отзывы из кода в базу — разово, кнопкой в админке. */
export async function seedReviews(list: Review[]): Promise<number> {
  if (!supabase) throw new Error("База не подключена");
  const rows = list.map(toRow);
  const { error } = await supabase.from("reviews").insert(rows);
  if (error) throw error;
  return rows.length;
}

/* ─────────────────── ЗАПАСНОЙ СПИСОК ───────────────────

   Берём его прямо из constants.ts, а не переписываем сюда копией: это
   те же самые тексты, и две копии однажды разойдутся. Блок отзывов без
   отзывов читается как поломка, поэтому пока таблица пуста страница
   живёт этим списком. Он же переносится в базу кнопкой в админке. */
export const fallbackReviews: Review[] = constReviews.map((r, i) => ({
  id: `const-${i}`,
  text: r.text,
  author: r.author,
  role: r.role,
  photos: [...r.photos],
  sort: i,
  published: true,
}));
