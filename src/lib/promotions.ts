import { Gift, Percent, Truck, Cake, Camera, Users } from "lucide-react";
import { supabase } from "./supabase";

/* ────────────────────────────── АКЦИИ ──────────────────────────────

   Плитка акции — плакат: крупная цифра выгоды, подпись под ней, слово
   вдоль правого края и обычный текст с условиями. Всё это правится в
   админке: проценты и суммы у студии меняются чаще всего остального, а
   до сих пор они были зашиты в коде.

   ЗНАЧОК И ШАР — НЕ СВОБОДНЫЕ ПОЛЯ, А ВЫБОР ИЗ СПИСКА, и это не
   упрощение ради формы.

   Значок — не картинка, а функция-компонент из lucide-react: положить в
   базу его нельзя, там может лежать только имя. Поэтому в строке
   хранится ключ, а сопоставление с компонентом живёт здесь.

   Шар — PNG, у которого вокруг рисунка своя ширина прозрачных полей.
   Плитка масштабирует не файл, а его непрозрачную часть, и доли этой
   части замерены заранее по каждому из шести файлов (таблица art в
   Promotions.tsx). Произвольная картинка этих замеров не имеет, и её бы
   растянуло по одной оси. */

export const PROMO_ICONS = {
  gift: { name: "Подарок", Icon: Gift },
  percent: { name: "Процент", Icon: Percent },
  truck: { name: "Доставка", Icon: Truck },
  cake: { name: "Торт", Icon: Cake },
  camera: { name: "Фотоаппарат", Icon: Camera },
  users: { name: "Двое", Icon: Users },
} as const;

export type PromoIconKey = keyof typeof PROMO_ICONS;

/** Шары, для которых замерены поля кадра. Порядок — как в файлах. */
export const PROMO_ARTS = [
  "/assets/ballon1.webp",
  "/assets/ballon2.webp",
  "/assets/ballon3.webp",
  "/assets/ballon4.webp",
  "/assets/ballon5.webp",
  "/assets/ballon6.webp",
] as const;

export type Promo = {
  id: string;
  /** Крупная надпись: «−10%», «0 ₽», «ПОДАРОК». */
  hero: string;
  /** Строка под ней: «за отзыв с фото». */
  heroSub: string;
  /** Короткое слово вдоль правого края плитки. */
  vertical: string;
  title: string;
  desc: string;
  /** Условие мелкой строкой внизу плитки. */
  cond: string;
  icon: PromoIconKey;
  art: string;
  /** Множитель размера шара — ломает одинаковость плиток. */
  artScale: number;
  sort: number;
  published: boolean;
};

/**
 * Длинную надпись набираем мельче, иначе она уезжает под вертикальное
 * слово справа.
 *
 * Считается по длине, а не хранится галочкой: отдельное поле «это
 * длинное слово?» пришлось бы объяснять, а ошибиться в нём — легко.
 * Порог 5 знаков разделяет ровно так же, как прежний ручной флаг:
 * «ПОДАРОК» — мельче, «−10%», «0 ₽», «−7%» — крупно.
 */
export const isWide = (hero: string) => hero.trim().length > 5;

export function blankPromo(): Promo {
  return {
    id: "",
    hero: "",
    heroSub: "",
    vertical: "",
    title: "",
    desc: "",
    cond: "",
    icon: "gift",
    art: PROMO_ARTS[0],
    artScale: 1,
    sort: 0,
    published: true,
  };
}

type Row = {
  id: string;
  hero: string | null;
  hero_sub: string | null;
  vertical: string | null;
  title: string | null;
  descr: string | null;
  cond: string | null;
  icon: string | null;
  art: string | null;
  art_scale: number | null;
  sort: number | null;
  published: boolean;
};

const fromRow = (r: Row): Promo => ({
  id: r.id,
  hero: r.hero ?? "",
  heroSub: r.hero_sub ?? "",
  vertical: r.vertical ?? "",
  title: r.title ?? "",
  desc: r.descr ?? "",
  cond: r.cond ?? "",
  // Значок мог остаться от версии, где ключей было больше или меньше —
  // на неизвестном имени плитка не должна падать.
  icon: (r.icon && r.icon in PROMO_ICONS ? r.icon : "gift") as PromoIconKey,
  art: r.art && PROMO_ARTS.includes(r.art as never) ? r.art : PROMO_ARTS[0],
  artScale: r.art_scale ?? 1,
  sort: r.sort ?? 0,
  published: r.published,
});

const toRow = (p: Promo) => ({
  hero: p.hero.trim(),
  hero_sub: p.heroSub.trim(),
  vertical: p.vertical.trim(),
  title: p.title.trim(),
  descr: p.desc.trim(),
  cond: p.cond.trim(),
  icon: p.icon,
  art: p.art,
  // Ограничение не косметическое: за этими пределами шар либо теряется
  // на плитке, либо вылезает за её пределы.
  art_scale: Math.min(1.6, Math.max(0.6, p.artScale || 1)),
  sort: p.sort ?? 0,
  published: p.published,
});

export async function fetchPromos(
  withDrafts = false,
): Promise<Promo[] | null> {
  if (!supabase) return null;

  let q = supabase.from("promotions").select("*").order("sort", {
    ascending: true,
  });
  if (!withDrafts) q = q.eq("published", true);

  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function savePromo(p: Promo): Promise<Promo> {
  if (!supabase) throw new Error("База не подключена");
  const row = toRow(p);
  const q = p.id
    ? supabase.from("promotions").update(row).eq("id", p.id)
    : supabase.from("promotions").insert(row);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deletePromo(id: string): Promise<void> {
  if (!supabase) throw new Error("База не подключена");
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

/** Переносит акции из кода в базу — разово, кнопкой в админке. */
export async function seedPromos(list: Promo[]): Promise<number> {
  if (!supabase) throw new Error("База не подключена");
  const rows = list.map(toRow);
  const { error } = await supabase.from("promotions").insert(rows);
  if (error) throw error;
  return rows.length;
}

/* ─────────────────── ЗАПАСНОЙ СПИСОК ───────────────────

   Акции, зашитые в коде. Ими страница живёт, пока таблица пуста: раздел
   акций без акций читается как поломка, а не как «сейчас ничего нет».
   Этот же список переносится в базу кнопкой в админке. */

export const fallbackPromos: Promo[] = [
  {
    id: "const-1",
    hero: "ПОДАРОК",
    //   — неразрывные пробелы внутри суммы: без них строка рвалась
    // между «1» и «000», и хвост «000 ₽» уезжал на следующую строку.
    heroSub: "к заказу от 1 000 ₽",
    vertical: "ДАРИМ",
    title: "Подарок к заказу от 1 000 ₽",
    desc: "Свеча-фонтан для торта, авторская открытка или мини-шар с вашей надписью — выбираете вы.",
    cond: "Начисляется автоматически при сумме от 1 000 ₽",
    icon: "gift",
    art: "/assets/ballon2.webp",
    artScale: 1.1,
    sort: 0,
    published: true,
  },
  {
    id: "const-2",
    hero: "−10%",
    heroSub: "за отзыв с фото",
    vertical: "СПАСИБО",
    title: "Скидка 10% за отзыв с фото",
    desc: "Поделитесь эмоциями от праздника во ВКонтакте, Instagram или на Яндекс Картах — и следующий заказ будет выгоднее.",
    cond: "Покажите отзыв при повторном заказе",
    icon: "percent",
    art: "/assets/ballon6.webp",
    artScale: 0.92,
    sort: 1,
    published: true,
  },
  {
    id: "const-3",
    hero: "0 ₽",
    heroSub: "доставка от 3 000 ₽",
    vertical: "ПРИВЕЗЁМ",
    title: "Бесплатная доставка от 3 000 ₽",
    desc: "Привезём композицию в защитном транспортировочном пакете точно к нужному часу — по городу бесплатно.",
    cond: "В черте города, время согласуем заранее",
    icon: "truck",
    art: "/assets/ballon5.webp",
    artScale: 1.15,
    sort: 2,
    published: true,
  },
  {
    id: "const-4",
    hero: "−7%",
    heroSub: "имениннику",
    vertical: "ДЕНЬ РОЖДЕНИЯ",
    title: "Скидка 7% ко дню рождения",
    desc: "Оформите заказ за три дня до торжества и получите персональную скидку на связки, цифры и фотозоны.",
    cond: "Действует за 3 дня до и 3 дня после даты",
    icon: "cake",
    art: "/assets/ballon1.webp",
    artScale: 0.95,
    sort: 3,
    published: true,
  },
  {
    id: "const-5",
    hero: "−10%",
    heroSub: "на весь заказ",
    vertical: "ПОД КЛЮЧ",
    title: "Праздник под ключ",
    desc: "Закажите композицию из шариков, добавьте любую услугу к заказу и получите скидку 10% на весь заказ.",
    cond: "При бронировании комплексного оформления",
    icon: "camera",
    art: "/assets/ballon3.webp",
    artScale: 0.88,
    sort: 4,
    published: true,
  },
  {
    id: "const-6",
    hero: "−10%",
    heroSub: "вам и другу",
    vertical: "ВДВОЁМ",
    title: "Приведите друга",
    desc: "Расскажите о студии знакомым. Друг заказывает впервые — скидку получаете оба: и он, и вы на следующий заказ.",
    cond: "Друг называет ваше имя при заказе",
    icon: "users",
    art: "/assets/ballon4.webp",
    artScale: 1.05,
    sort: 5,
    published: true,
  },
];
