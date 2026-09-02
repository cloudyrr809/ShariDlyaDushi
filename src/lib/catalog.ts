import { supabase } from "./supabase";
import { catalogCategories, themeSubcategories, productsData } from "../constants";

/* ─────────────────────────── ТОВАРЫ КАТАЛОГА ───────────────────────────

   Карточка композиции: название, цена, фотографии и категории.

   КАТЕГОРИЙ У КАРТОЧКИ НЕСКОЛЬКО, А НЕ ОДНА. Это не украшение, а
   исправление настоящей ошибки: раньше «одна карточка = одна категория»,
   и композицию, подходящую и мальчику, и девочке, приходилось заводить
   дважды. В коде так и было — 55 карточек, из которых 13 оказались
   копиями: «Динозаврик в колпачке» лежал и в «Для девочек», и в «Для
   мальчиков», «Шары латекс» — сразу в четырёх разделах. Внутри одного
   раздела это было незаметно, а во вкладке «Все» вылезло дублями.

   Со списком категорий копия не нужна: карточка одна, показывается в
   каждом отмеченном разделе, правится в одном месте.

   СПИСОК МОЖЕТ БЫТЬ ПУСТЫМ. Так добавляют композицию, для которой раздела
   ещё нет: она попадает только во «Все». */

/** Вкладка «Все» — не настоящая категория, а собирательная: в ней
    показываются ВСЕ карточки, включая те, у которых категорий нет.
    Стоит первой и в каталоге, и в выпадающем меню шапки. */
export const ALL_ID = "all";

export type Category = { id: string; name: string };

/** Категории для вкладок и меню: «Все» впереди, дальше как в constants. */
export const categoriesWithAll: Category[] = [
  { id: ALL_ID, name: "Все" },
  ...catalogCategories,
];

/** Категории, которые можно отметить у карточки: обычные плюс подкатегории
    «Тематических». Сама вкладка «Тематические» — контейнер для
    подкатегорий, класть карточку прямо в неё некуда. */
export const assignableCategories: Category[] = [
  ...catalogCategories.filter((c) => c.id !== "theme"),
  ...themeSubcategories,
];

export type Product = {
  id: string;
  /** Пусто — карточка вне разделов, видна только во «Все». */
  categories: string[];
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
    categories: [],
    title: "",
    price: 0,
    oldPrice: null,
    images: [],
    sort: 0,
    published: true,
  };
}

/** Показывать ли карточку на выбранной вкладке. «Все» берёт всё подряд. */
export const inCategory = (p: Product, tab: string) =>
  tab === ALL_ID || p.categories.includes(tab);

/* Строка базы пишется змеиным регистром, а код — верблюжьим. Перевод
   держим в одном месте, чтобы имена колонок не расползлись по файлам. */
type Row = {
  id: string;
  categories: string[] | null;
  title: string;
  price: number;
  old_price: number | null;
  images: string[] | null;
  sort: number | null;
  published: boolean;
};

const fromRow = (r: Row): Product => ({
  id: r.id,
  categories: r.categories ?? [],
  title: r.title,
  price: r.price,
  oldPrice: r.old_price,
  images: r.images ?? [],
  sort: r.sort ?? 0,
  published: r.published,
});

const toRow = (p: Product) => ({
  categories: p.categories,
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

/* ─────────────── ЗАПАСНОЙ СПИСОК И СКЛЕЙКА ДУБЛЕЙ ───────────────

   Карточки, зашитые в constants.ts. Ими каталог живёт, пока база пуста, —
   иначе витрина встретила бы посетителя пустотой.

   По пути склеиваем дубли: одинаковые название и набор фотографий —
   значит это одна композиция, заведённая несколько раз ради разных
   разделов. Собираем её в одну карточку со списком категорий. */
export const fallbackProducts: Product[] = (() => {
  const byKey = new Map<string, Product>();

  productsData.forEach((p, i) => {
    const images = p.images ?? [];
    const key = `${p.title.trim().toLowerCase()}|${images.join("|")}`;
    const seen = byKey.get(key);

    if (seen) {
      // Та же композиция из другого раздела — добавляем только категорию
      if (p.categoryId && !seen.categories.includes(p.categoryId)) {
        seen.categories.push(p.categoryId);
      }
      return;
    }

    byKey.set(key, {
      id: `const-${p.id}`,
      categories: p.categoryId ? [p.categoryId] : [],
      title: p.title,
      price: p.price,
      oldPrice: (p as { oldPrice?: number }).oldPrice ?? null,
      images,
      sort: i,
      published: true,
    });
  });

  return [...byKey.values()];
})();

/**
 * Переносит карточки из кода в базу — разово, кнопкой в админке.
 *
 * Переносится уже склеенный список, без дублей. Пути к фотографиям
 * остаются прежними («/assets/…»): файлы лежат в папке public и никуда не
 * делись, перезаливать их незачем.
 */
export async function seedProducts(): Promise<number> {
  if (!supabase) throw new Error("База не подключена");
  const rows = fallbackProducts.map(toRow);
  const { error } = await supabase.from("products").insert(rows);
  if (error) throw error;
  return rows.length;
}
