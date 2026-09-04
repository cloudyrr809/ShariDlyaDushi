import { supabase } from "./supabase";
import { localWebp } from "./media";

/* ────────────────────────────── УСЛУГИ ──────────────────────────────

   Карточка услуги устроена богаче товара: кроме названия и цены у неё
   есть срок, формат, короткая подпись, несколько абзацев описания,
   список «что входит» и галерея.

   key — короткое латинское имя: по нему работает якорь в адресе
   (/services#photosessions) и пункт выпадающего меню. Он должен быть
   уникальным и не меняться после публикации, иначе ссылки протухнут. */

export type Service = {
  id: string;
  key: string;
  title: string;
  /** «от 2 часов», «индивидуально» — свободная строка, не число. */
  time: string;
  price: number;
  format: string;
  shortDesc: string;
  paragraphs: string[];
  includes: string[];
  images: string[];
  sort: number;
  published: boolean;
};

export function blankService(): Service {
  return {
    id: "",
    key: "",
    title: "",
    time: "",
    price: 0,
    format: "",
    shortDesc: "",
    paragraphs: [],
    includes: [],
    images: [],
    sort: 0,
    published: true,
  };
}

/** Делает из названия латинский key: «Фотосессии» → «fotosessii».
    Нужен, когда услугу заводят с нуля и придумывать имя вручную лень. */
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => MAP[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type Row = {
  id: string;
  key: string;
  title: string;
  time: string | null;
  price: number | null;
  format: string | null;
  short_desc: string | null;
  paragraphs: string[] | null;
  includes: string[] | null;
  images: string[] | null;
  sort: number | null;
  published: boolean;
};

const fromRow = (r: Row): Service => ({
  id: r.id,
  key: r.key,
  title: r.title,
  time: r.time ?? "",
  price: r.price ?? 0,
  format: r.format ?? "",
  shortDesc: r.short_desc ?? "",
  paragraphs: r.paragraphs ?? [],
  includes: r.includes ?? [],
  images: (r.images ?? []).map(localWebp),
  sort: r.sort ?? 0,
  published: r.published,
});

const toRow = (s: Service) => ({
  key: (s.key || slugify(s.title)).trim(),
  title: s.title.trim(),
  time: s.time.trim(),
  price: Math.max(0, Math.round(s.price) || 0),
  format: s.format.trim(),
  short_desc: s.shortDesc.trim(),
  // Пустые строки в списках не храним: они дали бы на сайте пустой абзац
  // и пустой пункт в «что входит».
  paragraphs: s.paragraphs.map((p) => p.trim()).filter(Boolean),
  includes: s.includes.map((p) => p.trim()).filter(Boolean),
  images: s.images,
  sort: s.sort ?? 0,
  published: s.published,
});

export async function fetchServices(
  withDrafts = false,
): Promise<Service[] | null> {
  if (!supabase) return null;

  let q = supabase
    .from("services")
    .select("*")
    .order("sort", { ascending: true });
  if (!withDrafts) q = q.eq("published", true);

  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function saveService(s: Service): Promise<Service> {
  if (!supabase) throw new Error("База не подключена");
  const row = toRow(s);
  const q = s.id
    ? supabase.from("services").update(row).eq("id", s.id)
    : supabase.from("services").insert(row);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteService(id: string): Promise<void> {
  if (!supabase) throw new Error("База не подключена");
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

/** Переносит услуги из кода в базу — разово, кнопкой в админке. */
export async function seedServices(list: Service[]): Promise<number> {
  if (!supabase) throw new Error("База не подключена");
  const rows = list.map(toRow);
  const { error } = await supabase.from("services").insert(rows);
  if (error) throw error;
  return rows.length;
}
