import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { explain, isConfigured, supabase } from "./lib/supabase";
import { uploadImage, removeImage } from "./lib/media";
import {
  blankPost,
  deletePost,
  fetchPosts,
  savePost,
  type Post,
} from "./lib/feed";
import {
  assignableCategories,
  blankProduct,
  deleteProduct,
  fallbackProducts,
  fetchProducts,
  saveProduct,
  seedProducts,
  type Product,
} from "./lib/catalog";
import {
  blankService,
  deleteService,
  fetchServices,
  saveService,
  seedServices,
  slugify,
  type Service,
} from "./lib/services";
import { servicesData } from "./lib/servicesData";
import { Collage } from "./components/ui/PhotoCollage";

/* ═══════════════════════════ АДМИНКА САЙТА ═══════════════════════════

   Страница /admin: вход по паролю и три раздела — Лента, Каталог,
   Услуги. В меню сайта её нет и не должно быть: адрес набирают вручную,
   а доступ закрывают пароль и правила на стороне базы.

   Три состояния, и каждое честно объясняет, что происходит:
   1. база не подключена   → что настроить;
   2. подключена, не вошли → форма входа;
   3. вошли                → рабочий стол.

   Все три раздела устроены одинаково: слева список, справа форма. Общее
   вынесено в Shell, Gallery и ListPane — иначе три почти одинаковых
   экрана начали бы расходиться так же, как в своё время разошлись шапки
   страниц. */

const FIELD =
  "w-full rounded-xl border border-[#E8DEEE] bg-white px-4 py-3 text-[15px] font-medium text-[#2D2433] outline-none transition-colors focus:border-[#6B4E81]";
const LABEL =
  "mb-2 block text-sm font-semibold tracking-widest text-[#7E6E8A] uppercase";
const BTN =
  "cursor-pointer rounded-xl px-5 py-3 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BTN} bg-[#6B4E81] text-white hover:bg-[#513A6B]`;
const GHOST = `${BTN} border border-[#E8DEEE] bg-white text-[#6B4E81] hover:bg-[#F8F4F9]`;
const DANGER = `${BTN} inline-flex items-center gap-2 border border-[#E8C4CF] bg-white text-[#A64D6C] hover:bg-[#FBEEF2]`;

type Tab = "feed" | "catalog" | "services";
const TABS: { id: Tab; name: string }[] = [
  { id: "feed", name: "Лента" },
  { id: "catalog", name: "Каталог" },
  { id: "services", name: "Услуги" },
];

/** Короткое сообщение об ошибке — красное, но в палитре сайта. */
function Err({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-[#E8C4CF] bg-[#FBEEF2] px-4 py-3 text-[15px] font-medium text-[#A64D6C]">
      {text}
    </p>
  );
}

/** Рамка страницы: заголовок, переключатель разделов, содержимое. */
function Shell({
  children,
  tab,
  onTab,
  onExit,
}: {
  children: React.ReactNode;
  tab?: Tab;
  onTab?: (t: Tab) => void;
  onExit?: () => void;
}) {
  return (
    <div className="min-h-[70vh] bg-[#FDFBFD]">
      <div className="mx-auto w-full max-w-[79rem] px-6 pt-8 pb-20 md:pt-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold tracking-[-0.02em] text-[#2D2433] uppercase md:text-5xl">
            Админка
          </h1>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className={`${GHOST} inline-flex items-center gap-2`}
            >
              <LogOut className="h-5 w-5" />
              Выйти
            </button>
          )}
        </div>

        {tab && onTab && (
          <div className="mb-8 flex gap-6 border-b border-[#E8DEEE]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTab(t.id)}
                className={`-mb-px cursor-pointer border-b-2 pb-3 text-[15px] font-semibold transition-colors ${
                  tab === t.id
                    ? "border-[#2D2433] text-[#2D2433]"
                    : "border-transparent text-[#7E6E8A] hover:text-[#2D2433]"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

/* ─────────────────────── 1. БАЗА НЕ ПОДКЛЮЧЕНА ─────────────────────── */

function Setup() {
  return (
    <Shell>
      <div className="max-w-2xl space-y-4">
        <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
          База ещё не подключена, поэтому сайт показывает содержимое,
          зашитое в коде. Чтобы включить админку, нужно один раз завести
          бесплатный проект в Supabase и положить два его ключа в файл{" "}
          <code className="rounded bg-[#F0E5F5] px-1.5 py-0.5 font-semibold">
            .env
          </code>{" "}
          в корне сайта.
        </p>
        <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
          Пошаговая инструкция — в файле{" "}
          <code className="rounded bg-[#F0E5F5] px-1.5 py-0.5 font-semibold">
            SUPABASE.md
          </code>
          .
        </p>
      </div>
    </Shell>
  );
}

/* ───────────────────────────── 2. ВХОД ───────────────────────────── */

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });
    // Состояние сессии поймает подписка выше — здесь только про ошибку
    if (error) setErr("Не вошли: проверьте почту и пароль");
    setBusy(false);
  };

  return (
    <Shell>
      <form onSubmit={submit} className="max-w-sm space-y-5">
        <div>
          <label className={LABEL} htmlFor="email">
            Почта
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="password">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD}
          />
        </div>

        {err && <Err text={err} />}

        <button type="submit" disabled={busy} className={PRIMARY}>
          {busy ? "Входим…" : "Войти"}
        </button>
      </form>
    </Shell>
  );
}

/* ─────────────────────── ОБЩИЕ ЧАСТИ ФОРМ ─────────────────────── */

/** Меняет местами два соседних элемента — порядок правится стрелками. */
function moved<T>(list: T[], i: number, step: number): T[] {
  const to = i + step;
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[to]] = [copy[to], copy[i]];
  return copy;
}

/**
 * Галерея карточки: список снимков со стрелками порядка и удалением.
 *
 * ПОРЯДОК — ЭТО СМЫСЛ, а не мелочь: в ленте по нему строится раскладка
 * коллажа, в каталоге первый кадр показывается на карточке, в услугах он
 * открывает карусель. Поэтому стрелки везде, а не «перетащите мышью»:
 * перетаскивание на телефоне работает плохо.
 */
function Gallery({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState("");

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr("");
    setUploading(files.length);
    try {
      // Последовательно, а не разом: у бесплатного тарифа узкий канал, и
      // десяток параллельных отправок с телефона обрывается на середине.
      const next = [...images];
      for (const file of Array.from(files)) {
        const shot = await uploadImage(file);
        next.push(shot.src);
        onChange([...next]);
        setUploading((n) => n - 1);
      }
    } catch (e) {
      setErr(explain(e, "фотографии"));
    } finally {
      setUploading(0);
    }
  };

  const drop = async (i: number) => {
    const src = images[i];
    onChange(images.filter((_, k) => k !== i));
    // Файл убираем сразу: иначе за год накопятся сотни картинок, которые
    // ни в одной карточке не участвуют.
    await removeImage(src).catch(() => {});
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div
            key={src}
            className="relative h-28 w-28 overflow-hidden rounded-xl border border-[#E8DEEE] bg-white"
          >
            <img src={src} alt="" className="h-full w-full object-cover" />

            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-[#2D2433]/60 px-1 py-0.5">
              <button
                type="button"
                onClick={() => onChange(moved(images, i, -1))}
                disabled={i === 0}
                aria-label="Левее"
                className="cursor-pointer rounded p-1 text-white disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4 -rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => onChange(moved(images, i, 1))}
                disabled={i === images.length - 1}
                aria-label="Правее"
                className="cursor-pointer rounded p-1 text-white disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4 -rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => drop(i)}
                aria-label={`Убрать фотографию ${i + 1}`}
                className="cursor-pointer rounded p-1 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <label className={`${GHOST} mt-3 inline-flex items-center gap-2`}>
        {uploading > 0 ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Загружаем… осталось {uploading}
          </>
        ) : (
          <>
            <Plus className="h-5 w-5" />
            Добавить фотографии
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = ""; // чтобы тот же файл можно было выбрать снова
          }}
        />
      </label>

      {err && <div className="mt-3">{<Err text={err} />}</div>}
    </div>
  );
}

/** Редактируемый список строк: абзацы описания, пункты «что входит». */
function Lines({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      {value.map((line, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            rows={rows}
            value={line}
            onChange={(e) => {
              const next = [...value];
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            className={`${FIELD} resize-y leading-relaxed`}
          />
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => onChange(moved(value, i, -1))}
              disabled={i === 0}
              aria-label="Выше"
              className="cursor-pointer rounded-lg p-1.5 text-[#6B4E81] hover:bg-[#F8F4F9] disabled:opacity-30"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, k) => k !== i))}
              aria-label="Убрать"
              className="cursor-pointer rounded-lg p-1.5 text-[#A64D6C] hover:bg-[#FBEEF2]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className={`${GHOST} inline-flex items-center gap-2`}
      >
        <Plus className="h-5 w-5" />
        Добавить
      </button>
    </div>
  );
}

/** Кнопки под формой: сохранить, видимость, отмена, удалить. */
function Actions({
  busy,
  canSave,
  published,
  canPublish,
  hint,
  onSave,
  onPublished,
  onCancel,
  onDelete,
}: {
  busy: boolean;
  canSave: boolean;
  published: boolean;
  canPublish: boolean;
  hint?: string;
  onSave: () => void;
  onPublished: (v: boolean) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-[#E8DEEE] pt-6">
      <button
        type="button"
        onClick={onSave}
        disabled={busy || !canSave}
        className={PRIMARY}
      >
        {busy ? "Сохраняем…" : "Сохранить"}
      </button>

      <label
        className={`flex items-center gap-2 text-[15px] font-semibold text-[#5A4D66] ${
          canPublish ? "cursor-pointer" : "cursor-not-allowed opacity-50"
        }`}
      >
        <input
          type="checkbox"
          checked={published && canPublish}
          disabled={!canPublish}
          onChange={(e) => onPublished(e.target.checked)}
          className="h-5 w-5 accent-[#6B4E81]"
        />
        Виден на сайте
      </label>

      {hint && (
        <span className="text-sm font-medium text-[#7E6E8A]">{hint}</span>
      )}

      <button type="button" onClick={onCancel} className={`${GHOST} ml-auto`}>
        Отмена
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className={DANGER}
        >
          <Trash2 className="h-5 w-5" />
          Удалить
        </button>
      )}
    </div>
  );
}

/** Левая колонка: кнопка «создать» и список записей. */
function ListPane<T extends { id: string }>({
  items,
  currentId,
  newLabel,
  onNew,
  onPick,
  render,
  extra,
}: {
  items: T[] | null;
  currentId?: string;
  newLabel: string;
  onNew: () => void;
  onPick: (item: T) => void;
  render: (item: T) => { title: string; note: string };
  /** Например, кнопка переноса данных из кода — показывается под списком. */
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onNew}
        className={`${PRIMARY} mb-4 inline-flex w-full items-center justify-center gap-2`}
      >
        <Plus className="h-5 w-5" />
        {newLabel}
      </button>

      {items === null ? (
        <p className="text-[15px] font-medium text-[#7E6E8A]">Читаем…</p>
      ) : items.length === 0 ? (
        <p className="text-[15px] font-medium text-[#7E6E8A]">
          Пока пусто. Первую запись — кнопкой выше.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const { title, note } = render(it);
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onPick(it)}
                  className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                    currentId === it.id
                      ? "border-[#6B4E81] bg-[#F8F4F9]"
                      : "border-[#E8DEEE] bg-white hover:bg-[#FBF7FC]"
                  }`}
                >
                  <span className="block text-[15px] font-semibold text-[#2D2433]">
                    {title || "Без названия"}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#7E6E8A]">
                    {note}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {extra && <div className="mt-6">{extra}</div>}
    </div>
  );
}

/* ─────────────────────── ФОРМА ПОСТА «ЛЕНТЫ» ─────────────────────── */

/** Название раздела для понятных сообщений об ошибках базы. */
const SECTION_FEED = "Лента";

function PostEditor({
  post,
  onSaved,
  onDeleted,
  onCancel,
}: {
  post: Post;
  onSaved: () => void;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Post>(post);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /** Опубликовать можно только пост с фотографией: без неё он на сайте
      всё равно не покажется — лента такие отсеивает. */
  const canPublish = draft.photos.length > 0;

  const set = <K extends keyof Post>(k: K, v: Post[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await savePost({ ...draft, published: draft.published && canPublish });
      onSaved();
    } catch (e) {
      setErr(explain(e, SECTION_FEED));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Удалить пост «${draft.title}»? Это навсегда.`)) return;
    setBusy(true);
    try {
      await deletePost(draft.id);
      onDeleted();
    } catch (e) {
      setErr(explain(e, SECTION_FEED));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className={LABEL} htmlFor="date">
          Дата
        </label>
        <input
          id="date"
          type="date"
          value={draft.date}
          onChange={(e) => set("date", e.target.value)}
          className={`${FIELD} sm:max-w-[16rem]`}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="title">
          Заголовок
        </label>
        <input
          id="title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Осень на кирпичной стене"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="text">
          Текст
        </label>
        <textarea
          id="text"
          rows={5}
          value={draft.text}
          onChange={(e) => set("text", e.target.value)}
          placeholder="Пара предложений о том, что это за работа."
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      <div>
        <span className={LABEL}>Фотографии</span>
        <Gallery
          images={draft.photos.map((p) => p.src)}
          onChange={(next) =>
            /* Сохраняем известные размеры и подписи: они пришли при
               загрузке, а по одному адресу их уже не восстановить. */
            set(
              "photos",
              next.map(
                (src) => draft.photos.find((p) => p.src === src) ?? { src },
              ),
            )
          }
        />
      </div>

      {draft.photos.length > 0 && (
        <div>
          <span className={LABEL}>Как это увидят на сайте</span>
          <div className="rounded-2xl border border-[#E8DEEE] bg-[#F8F4F9] p-4">
            <div className="max-w-[38rem]">
              <Collage photos={draft.photos} onOpen={() => {}} />
            </div>
            {draft.photos.length > 5 && (
              <p className="mt-3 text-[15px] font-medium text-[#5A4D66]">
                Показываются первые кадры, остальные — под плашкой «+N»: по
                клику открывается вся серия. Порядок меняется стрелками.
              </p>
            )}
          </div>
        </div>
      )}

      {err && <Err text={err} />}

      <Actions
        busy={busy}
        canSave={!!draft.title.trim()}
        published={draft.published}
        canPublish={canPublish}
        hint={canPublish ? undefined : "добавьте фото, чтобы опубликовать"}
        onSave={save}
        onPublished={(v) => set("published", v)}
        onCancel={onCancel}
        onDelete={draft.id ? remove : undefined}
      />
    </div>
  );
}

/* ─────────────────── ФОРМА КАРТОЧКИ КАТАЛОГА ─────────────────── */

/** Название раздела для понятных сообщений об ошибках базы. */
const SECTION_CATALOG = "Каталог";

function ProductEditor({
  product,
  onSaved,
  onDeleted,
  onCancel,
}: {
  product: Product;
  onSaved: () => void;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Product>(product);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await saveProduct(draft);
      onSaved();
    } catch (e) {
      setErr(explain(e, SECTION_CATALOG));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Удалить «${draft.title}»? Это навсегда.`)) return;
    setBusy(true);
    try {
      await deleteProduct(draft.id);
      onDeleted();
    } catch (e) {
      setErr(explain(e, SECTION_CATALOG));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className={LABEL} htmlFor="p-title">
          Название
        </label>
        <input
          id="p-title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Композиция с цифрой 5"
          className={FIELD}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={LABEL} htmlFor="p-price">
            Цена, ₽
          </label>
          <input
            id="p-price"
            type="number"
            min={0}
            value={draft.price || ""}
            onChange={(e) => set("price", Number(e.target.value))}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="p-old">
            Старая цена
          </label>
          <input
            id="p-old"
            type="number"
            min={0}
            value={draft.oldPrice || ""}
            onChange={(e) => set("oldPrice", Number(e.target.value) || null)}
            placeholder="без скидки — пусто"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="p-sort">
            Порядок
          </label>
          <input
            id="p-sort"
            type="number"
            value={draft.sort}
            onChange={(e) => set("sort", Number(e.target.value) || 0)}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <span className={LABEL}>Разделы</span>
        {/* ГАЛОЧКИ, А НЕ ВЫБОР ОДНОГО. Композиция часто подходит сразу
            нескольким разделам, и раньше её приходилось заводить дважды —
            в каталоге из-за этого набралось 13 карточек-двойников.
            Отмечаем сколько нужно, карточка остаётся одна. */}
        <div className="flex flex-wrap gap-2">
          {assignableCategories.map((c) => {
            const on = draft.categories.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[15px] font-medium transition ${
                  on
                    ? "border-[#6B4E81] bg-[#F8F4F9] text-[#2D2433]"
                    : "border-[#E8DEEE] bg-white text-[#5A4D66] hover:bg-[#FBF7FC]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) =>
                    set(
                      "categories",
                      e.target.checked
                        ? [...draft.categories, c.id]
                        : draft.categories.filter((x) => x !== c.id),
                    )
                  }
                  className="h-4 w-4 accent-[#6B4E81]"
                />
                {c.name}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-sm font-medium text-[#7E6E8A]">
          Можно не отмечать ни одного — тогда композиция будет только в
          разделе «Все». Он собирает весь каталог в любом случае.
        </p>
      </div>

      <div>
        <span className={LABEL}>Фотографии</span>
        <Gallery
          images={draft.images}
          onChange={(next) => set("images", next)}
        />
        <p className="mt-2 text-sm font-medium text-[#7E6E8A]">
          Первая — главная: она видна на карточке в каталоге, остальные
          листаются наведением.
        </p>
      </div>

      {err && <Err text={err} />}

      <Actions
        busy={busy}
        canSave={!!draft.title.trim()}
        published={draft.published}
        canPublish={draft.images.length > 0}
        hint={
          draft.images.length > 0 ? undefined : "добавьте фото, чтобы показать"
        }
        onSave={save}
        onPublished={(v) => set("published", v)}
        onCancel={onCancel}
        onDelete={draft.id ? remove : undefined}
      />
    </div>
  );
}

/* ─────────────────────── ФОРМА УСЛУГИ ─────────────────────── */

/** Название раздела для понятных сообщений об ошибках базы. */
const SECTION_SERVICES = "Услуги";

function ServiceEditor({
  service,
  onSaved,
  onDeleted,
  onCancel,
}: {
  service: Service;
  onSaved: () => void;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Service>(service);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = <K extends keyof Service>(k: K, v: Service[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await saveService(draft);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось сохранить";
      // Понятное объяснение вместо «duplicate key value violates…»
      setErr(
        /duplicate|unique/i.test(msg)
          ? "Услуга с таким адресом уже есть — измените поле «Адрес»"
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Удалить услугу «${draft.title}»? Это навсегда.`)) return;
    setBusy(true);
    try {
      await deleteService(draft.id);
      onDeleted();
    } catch (e) {
      setErr(explain(e, SECTION_SERVICES));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className={LABEL} htmlFor="s-title">
          Название
        </label>
        <input
          id="s-title"
          value={draft.title}
          onChange={(e) => {
            const title = e.target.value;
            setDraft((d) => ({
              ...d,
              title,
              // Адрес подставляем сам, пока услугу не сохранили: у новой
              // его придумывать не хочется, у сохранённой менять опасно —
              // по нему уже могли дать ссылку.
              key: d.id ? d.key : slugify(title),
            }));
          }}
          placeholder="Фотосессии"
          className={FIELD}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="s-key">
            Адрес раздела
          </label>
          <input
            id="s-key"
            value={draft.key}
            onChange={(e) => set("key", e.target.value)}
            placeholder="photosessions"
            className={FIELD}
          />
          <p className="mt-2 text-sm font-medium text-[#7E6E8A]">
            Ссылка будет /services#{draft.key || "…"}. Латиницей, без
            пробелов. После публикации лучше не менять.
          </p>
        </div>

        <div>
          <label className={LABEL} htmlFor="s-short">
            Короткая подпись
          </label>
          <input
            id="s-short"
            value={draft.shortDesc}
            onChange={(e) => set("shortDesc", e.target.value)}
            placeholder="— профессиональная съемка ваших праздников"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-4">
        <div>
          <label className={LABEL} htmlFor="s-price">
            Цена, ₽
          </label>
          <input
            id="s-price"
            type="number"
            min={0}
            value={draft.price || ""}
            onChange={(e) => set("price", Number(e.target.value))}
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="s-time">
            Срок
          </label>
          <input
            id="s-time"
            value={draft.time}
            onChange={(e) => set("time", e.target.value)}
            placeholder="от 2 часов"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="s-format">
            Формат
          </label>
          <input
            id="s-format"
            value={draft.format}
            onChange={(e) => set("format", e.target.value)}
            placeholder="студия / улица / дом"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="s-sort">
            Порядок
          </label>
          <input
            id="s-sort"
            type="number"
            value={draft.sort}
            onChange={(e) => set("sort", Number(e.target.value) || 0)}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <span className={LABEL}>Описание — по абзацам</span>
        <Lines
          value={draft.paragraphs}
          onChange={(next) => set("paragraphs", next)}
          placeholder="Абзац описания услуги"
          rows={3}
        />
      </div>

      <div>
        <span className={LABEL}>Что входит</span>
        <Lines
          value={draft.includes}
          onChange={(next) => set("includes", next)}
          placeholder="Работа фотографа и помощь в позировании"
          rows={1}
        />
      </div>

      <div>
        <span className={LABEL}>Фотографии</span>
        <Gallery
          images={draft.images}
          onChange={(next) => set("images", next)}
        />
      </div>

      {err && <Err text={err} />}

      <Actions
        busy={busy}
        canSave={!!draft.title.trim() && !!draft.key.trim()}
        published={draft.published}
        canPublish
        onSave={save}
        onPublished={(v) => set("published", v)}
        onCancel={onCancel}
        onDelete={draft.id ? remove : undefined}
      />
    </div>
  );
}

/* ──────────────────── КНОПКА ПЕРЕНОСА ИЗ КОДА ────────────────────

   До админки товары и услуги были записаны прямо в коде. Пока таблица
   пуста, сайт продолжает показывать их — иначе каталог встретил бы
   посетителя пустотой. Эта кнопка переносит их в базу один раз, после
   чего правятся они уже здесь.

   Пути к фотографиям при переносе не меняются: файлы лежат в папке
   public и никуда не делись. */
function SeedButton({
  count,
  onSeed,
  what,
}: {
  count: number;
  onSeed: () => Promise<number>;
  what: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div className="rounded-xl border border-[#E8DEEE] bg-[#FBF7FC] p-4">
      <p className="text-[15px] leading-relaxed font-medium text-[#5A4D66]">
        {what} сейчас берутся из кода ({count} шт.) — их ещё не перенесли в
        базу. До переноса править их здесь нельзя.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr("");
          try {
            await onSeed();
          } catch (e) {
            setErr(explain(e, what));
          } finally {
            setBusy(false);
          }
        }}
        className={`${PRIMARY} mt-3`}
      >
        {busy ? "Переносим…" : "Перенести в базу"}
      </button>
      {err && <div className="mt-3">{<Err text={err} />}</div>}
    </div>
  );
}

/* ──────────────────────── РАБОЧИЙ СТОЛ ──────────────────────── */

const PANE = "grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)]";
const EMPTY =
  "text-[17px] leading-relaxed font-medium text-[#5A4D66]";

function FeedPane() {
  const [items, setItems] = useState<Post[] | null>(null);
  const [current, setCurrent] = useState<Post | null>(null);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      setItems(await fetchPosts(true)); // с черновиками
    } catch (e) {
      setErr(explain(e, "Лента"));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <>
      {err && <div className="mb-6">{<Err text={err} />}</div>}
      <div className={PANE}>
        <ListPane
          items={items}
          currentId={current?.id}
          newLabel="Новый пост"
          onNew={() => setCurrent(blankPost())}
          onPick={setCurrent}
          render={(p) => ({
            title: p.title,
            note: `${p.date} · ${p.photos.length} фото${p.published ? "" : " · черновик"}`,
          })}
        />
        <div>
          {current ? (
            <PostEditor
              key={current.id || "new"}
              post={current}
              onSaved={() => {
                setCurrent(null);
                reload();
              }}
              onDeleted={() => {
                setCurrent(null);
                reload();
              }}
              onCancel={() => setCurrent(null)}
            />
          ) : (
            <p className={EMPTY}>Выберите пост слева или создайте новый.</p>
          )}
        </div>
      </div>
    </>
  );
}

function CatalogPane() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [current, setCurrent] = useState<Product | null>(null);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      setItems(await fetchProducts(true));
    } catch (e) {
      setErr(explain(e, "Каталог"));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Названия отмеченных разделов через запятую — для строки в списке. */
  const names = (ids: string[]) =>
    ids.length === 0
      ? "только «Все»"
      : ids
          .map((id) => assignableCategories.find((c) => c.id === id)?.name ?? id)
          .join(", ");

  return (
    <>
      {err && <div className="mb-6">{<Err text={err} />}</div>}
      <div className={PANE}>
        <ListPane
          items={items}
          currentId={current?.id}
          newLabel="Новая композиция"
          onNew={() => setCurrent(blankProduct())}
          onPick={setCurrent}
          render={(p) => ({
            title: p.title,
            note: `${p.price} ₽ · ${names(p.categories)}${p.published ? "" : " · скрыта"}`,
          })}
          extra={
            items?.length === 0 ? (
              <SeedButton
                what="Композиции каталога"
                count={fallbackProducts.length}
                onSeed={async () => {
                  const n = await seedProducts();
                  await reload();
                  return n;
                }}
              />
            ) : undefined
          }
        />
        <div>
          {current ? (
            <ProductEditor
              key={current.id || "new"}
              product={current}
              onSaved={() => {
                setCurrent(null);
                reload();
              }}
              onDeleted={() => {
                setCurrent(null);
                reload();
              }}
              onCancel={() => setCurrent(null)}
            />
          ) : (
            <p className={EMPTY}>
              Выберите композицию слева или создайте новую. Любая карточка
              сразу попадает в раздел «Все», а разделы можно не отмечать —
              или отметить сразу несколько.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function ServicesPane() {
  const [items, setItems] = useState<Service[] | null>(null);
  const [current, setCurrent] = useState<Service | null>(null);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      setItems(await fetchServices(true));
    } catch (e) {
      setErr(explain(e, "Услуги"));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <>
      {err && <div className="mb-6">{<Err text={err} />}</div>}
      <div className={PANE}>
        <ListPane
          items={items}
          currentId={current?.id}
          newLabel="Новая услуга"
          onNew={() => setCurrent(blankService())}
          onPick={setCurrent}
          render={(s) => ({
            title: s.title,
            note: `${s.price} ₽ · ${s.images.length} фото${s.published ? "" : " · скрыта"}`,
          })}
          extra={
            items?.length === 0 ? (
              <SeedButton
                what="Услуги"
                count={servicesData.length}
                onSeed={async () => {
                  const n = await seedServices(
                    servicesData.map((s, i) => ({
                      ...s,
                      sort: i,
                      published: true,
                    })),
                  );
                  await reload();
                  return n;
                }}
              />
            ) : undefined
          }
        />
        <div>
          {current ? (
            <ServiceEditor
              key={current.id || "new"}
              service={current}
              onSaved={() => {
                setCurrent(null);
                reload();
              }}
              onDeleted={() => {
                setCurrent(null);
                reload();
              }}
              onCancel={() => setCurrent(null)}
            />
          ) : (
            <p className={EMPTY}>Выберите услугу слева или создайте новую.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── ТОЧКА ВХОДА ─────────────────────────── */

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isConfigured);
  const [tab, setTab] = useState<Tab>("feed");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isConfigured) return <Setup />;
  if (!ready) return <Shell>{null}</Shell>;
  if (!session) return <Login />;

  return (
    <Shell tab={tab} onTab={setTab} onExit={() => supabase!.auth.signOut()}>
      {tab === "feed" && <FeedPane />}
      {tab === "catalog" && <CatalogPane />}
      {tab === "services" && <ServicesPane />}
    </Shell>
  );
}
