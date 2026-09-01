import { supabase } from "./supabase";
import { catalogCategories, themeSubcategories, productsData } from "../constants";

/* ─────────────────────────── ТОВАРЫ КАТАЛОГА ───────────────────────────

   Карточка композиции: название, цена, фотографии и категория.

   КАТЕГОРИЯ МОЖЕТ БЫТЬ ПУСТОЙ. Так студия добавляет карточку, для которой
   раздела ещё нет, — она попадает только во «Все» и не мешает разбору по
   полкам. Пустая строка, а не отдельный флаг: в базе это просто NULL. */

/** Вкладка «Все» — не настоящая категория, а собирательная: в ней
    показываются ВСЕ карточки, включая те, у которых категории нет.
    Стоит первой и в каталоге, и в выпадающем меню шапки. */
export const ALL_ID = "all";

export type Category = { id: string; name: string };

/** Категории для вкладок и меню: «Все» впереди, дальше как в constants. */
export const categoriesWithAll: Category[] = [
  { id: ALL_ID, name: "Все" },
  ...catalogCategories,
];

/** Плоский список всех категорий, куда можно положить карточку: обычные
    плюс подкатегории «Тематических». Сама вкладка «Тематические» —
    контейнер для подкатегорий, класть карточку прямо в неё некуда. */
export const assignableCategories: Category[] = [
  ...catalogCategories.filter((c) => c.id !== "theme"),
  ...themeSubcategories,
];

export type Product = {
  id: string;
  /** Пустая строка — карточка вне категорий, видна только во «Все». */
  categoryId: string;
  title: string;
  price: number;
  /** Ноль или пусто — старой цены нет и зачёркнутого числа не будет. */
  oldPrice?: number | null;
  images: string[];
  /** Чем меньше, тем выше в списке. */
  sort: number;
  published: boolean;
};

/** Пустая карточка для формы «новая композиция». */
export function blankProduct(): Product {
  return {
    id: "",
    categoryId: "",
    title: "",
    price: 0,
    oldPrice: null,
    images: [],
    sort: 0,
    published: true,
  };
}

/* Строка базы пишется змеиным регистром (category_id), а код — верблюжьим.
   Перевод держим в одном месте, чтобы имена колонок не расползлись по
   компонентам. */
type Row = {
  id: string;
  category_id: string | null;
  title: string;
  price: number;
  old_price: number | null;
  images: string[] | null;
  sort: number | null;
  published: boolean;
};

const fromRow = (r: Row): Product => ({
  id: r.id,
  categoryId: r.category_id ?? "",
  title: r.title,
  price: r.price,
  oldPrice: r.old_price,
  images: r.images ?? [],
  sort: r.sort ?? 0,
  published: r.published,
});

const toRow = (p: Product) => ({
  category_id: p.categoryId || null,
  title: p.title.trim(),
  price: Math.max(0, Math.round(p.price) || 0),
  old_price: p.oldPrice ? Math.round(p.oldPrice) : null,
  images: p.images,
  sort: p.sort ?? 0,
  published: p.published,
});

/**
 * Читает карточки. `null` — база не подключена: вызывающий код по этому
 * различию решает, брать ли запасной список из constants.ts.
 */
export async function fetchProducts(
  withDrafts = false,
): Promise<Product[] | null> {
  if (!supabase) return null;

  let q = supabase
    .from("products")
    .select("*")
    .order("sort", { ascending: true })
    .order("title", { ascending: true });
  if (!withDrafts) q = q.eq("published", true);

  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function saveProduct(p: Product): Promise<Product> {
  if (!supabase) throw new Error("База не подключена");
  const row = toRow(p);
  const q = p.id
    ? supabase.from("products").update(row).eq("id", p.id)
    : supabase.from("products").insert(row);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!supabase) throw new Error("База не подключена");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/** Запасной список: карточки, зашитые в constants.ts. Ими каталог живёт,
    пока база пуста, — иначе страница встретила бы посетителя пустотой. */
export const fallbackProducts: Product[] = productsData.map((p, i) => ({
  id: `const-${p.id}`,
  categoryId: p.categoryId ?? "",
  title: p.title,
  price: p.price,
  oldPrice: (p as { oldPrice?: number }).oldPrice ?? null,
  images: p.images ?? [],
  sort: i,
  published: true,
}));

/**
 * Переносит карточки из кода в базу — разово, кнопкой в админке.
 *
 * Пути к фотографиям остаются прежними («/assets/…»): файлы лежат в папке
 * public и никуда не делись, перезаливать их незачем.
 */
export async function seedProducts(): Promise<number> {
  if (!supabase) throw new Error("База не подключена");
  const rows = fallbackProducts.map(toRow);
  const { error } = await supabase.from("products").insert(rows);
  if (error) throw error;
  return rows.length;
}
