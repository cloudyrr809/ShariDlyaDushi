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
import { isConfigured, supabase } from "./lib/supabase";
import {
  blankPost,
  deletePost,
  fetchPosts,
  removePhoto,
  savePost,
  uploadPhoto,
  type Post,
} from "./lib/feed";
import { Collage } from "./components/ui/PhotoCollage";

/* ═══════════════════════════ АДМИНКА «ЛЕНТЫ» ═══════════════════════════

   Страница /admin: вход по паролю, список публикаций и форма поста.
   В меню сайта её нет и не должно быть — адрес набирается вручную.

   Три состояния, и каждое честно объясняет, что происходит:
   1. база не подключена  → что настроить;
   2. подключена, но не вошли → форма входа;
   3. вошли → рабочий стол.

   Главное здесь — ПРЕДПРОСМОТР КОЛЛАЖА прямо в форме. Раскладку кадров
   считает та же функция, что и на сайте, поэтому видно ровно то, что
   увидит посетитель: какие кадры крупные, какие в стопке и сколько уйдёт
   под плашку «+N». Порядок снимков меняется стрелками — им и правится
   раскладка, если она вышла неудачной. */

const FIELD =
  "w-full rounded-xl border border-[#E8DEEE] bg-white px-4 py-3 text-[15px] font-medium text-[#2D2433] outline-none transition-colors focus:border-[#6B4E81]";
const LABEL =
  "mb-2 block text-sm font-semibold tracking-widest text-[#7E6E8A] uppercase";
const BTN = "cursor-pointer rounded-xl px-5 py-3 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY = `${BTN} bg-[#6B4E81] text-white hover:bg-[#513A6B]`;
const GHOST = `${BTN} border border-[#E8DEEE] bg-white text-[#6B4E81] hover:bg-[#F8F4F9]`;

/** Рамка страницы: заголовок и содержимое. */
function Shell({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="min-h-[70vh] bg-[#FDFBFD]">
      <div className="mx-auto w-full max-w-[79rem] px-6 pt-8 pb-20 md:pt-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold tracking-[-0.02em] text-[#2D2433] uppercase md:text-5xl">
            Лента · админка
          </h1>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Короткое сообщение об ошибке — красное, но в палитре сайта. */
function Err({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-[#E8C4CF] bg-[#FBEEF2] px-4 py-3 text-[15px] font-medium text-[#A64D6C]">
      {text}
    </p>
  );
}

/* ─────────────────────── 1. БАЗА НЕ ПОДКЛЮЧЕНА ─────────────────────── */

function Setup() {
  return (
    <Shell>
      <div className="max-w-2xl space-y-4">
        <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
          База ещё не подключена, поэтому «Лента» показывает образцовые посты
          из кода. Чтобы включить админку, нужно один раз завести бесплатный
          проект в Supabase и положить два его ключа в файл{" "}
          <code className="rounded bg-[#F0E5F5] px-1.5 py-0.5 font-semibold">
            .env
          </code>{" "}
          в корне сайта.
        </p>
        <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
          Пошаговая инструкция лежит в файле{" "}
          <code className="rounded bg-[#F0E5F5] px-1.5 py-0.5 font-semibold">
            SUPABASE.md
          </code>{" "}
          — там же готовый запрос, который создаёт таблицу и папку для
          снимков.
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

/* ──────────────────────── 3. ФОРМА ПОСТА ──────────────────────── */

function Editor({
  post,
  onSaved,
  onDeleted,
  onCancel,
}: {
  post: Post;
  onSaved: (p: Post) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Post>(post);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState("");

  /** Опубликовать можно только пост с фотографией: без неё он на сайте
      всё равно не покажется (лента такие отсеивает). */
  const canPublish = draft.photos.length > 0;

  // Выбрали другой пост в списке — форма показывает его
  useEffect(() => setDraft(post), [post]);

  const set = <K extends keyof Post>(k: K, v: Post[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr("");
    setUploading(files.length);
    try {
      // Последовательно, а не разом: у бесплатного тарифа узкий канал, и
      // десяток параллельных отправок с телефона обрывается на середине.
      for (const file of Array.from(files)) {
        const shot = await uploadPhoto(file);
        setDraft((d) => ({ ...d, photos: [...d.photos, shot] }));
        setUploading((n) => n - 1);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось загрузить снимок");
    } finally {
      setUploading(0);
    }
  };

  const move = (i: number, step: number) => {
    const to = i + step;
    if (to < 0 || to >= draft.photos.length) return;
    const photos = [...draft.photos];
    [photos[i], photos[to]] = [photos[to], photos[i]];
    set("photos", photos);
  };

  const drop = async (i: number) => {
    const shot = draft.photos[i];
    set(
      "photos",
      draft.photos.filter((_, k) => k !== i),
    );
    // Файл из хранилища убираем сразу: иначе за год накопятся сотни
    // снимков, которые ни в одном посте не участвуют.
    await removePhoto(shot.src).catch(() => {});
  };

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      // Пост без фото уходит в базу как черновик, даже если галку не
      // сняли: на сайте он всё равно не покажется, а в базе «опубликован
      // без фото» — противоречивое состояние.
      const clean = { ...draft, published: draft.published && canPublish };
      setDraft(clean);
      onSaved(await savePost(clean));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return onCancel();
    if (!confirm(`Удалить пост «${draft.title}»? Это навсегда.`)) return;
    setBusy(true);
    try {
      await deletePost(draft.id);
      onDeleted(draft.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось удалить");
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
          rows={4}
          value={draft.text}
          onChange={(e) => set("text", e.target.value)}
          placeholder="Пара предложений о том, что это за работа."
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      {/* ───────── СНИМКИ ───────── */}
      <div>
        <span className={LABEL}>Фотографии</span>

        <div className="space-y-3">
          {draft.photos.map((s, i) => (
            <div
              key={s.src}
              className="flex items-center gap-3 rounded-xl border border-[#E8DEEE] bg-white p-3"
            >
              <img
                src={s.src}
                alt=""
                className="h-20 w-20 shrink-0 rounded-lg object-cover"
              />

              <div className="min-w-0 flex-1">
                <input
                  value={s.caption ?? ""}
                  onChange={(e) => {
                    const photos = [...draft.photos];
                    photos[i] = { ...s, caption: e.target.value || undefined };
                    set("photos", photos);
                  }}
                  placeholder="Подпись к кадру — необязательно"
                  className={`${FIELD} px-3 py-2`}
                />
                <p className="mt-1.5 text-sm font-semibold text-[#7E6E8A]">
                  {i + 1} · {s.w}×{s.h}
                </p>
              </div>

              {/* Порядок кадров — это и есть управление раскладкой:
                  первый обычно становится самым крупным. */}
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Выше"
                  className="cursor-pointer rounded-lg p-1.5 text-[#6B4E81] hover:bg-[#F8F4F9] disabled:opacity-30"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === draft.photos.length - 1}
                  aria-label="Ниже"
                  className="cursor-pointer rounded-lg p-1.5 text-[#6B4E81] hover:bg-[#F8F4F9] disabled:opacity-30"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => drop(i)}
                aria-label={`Убрать фотографию ${i + 1}`}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-[#A64D6C] hover:bg-[#FBEEF2]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        <label
          className={`${GHOST} mt-3 inline-flex items-center gap-2`}
          role="button"
        >
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
              addFiles(e.target.files);
              e.target.value = ""; // чтобы тот же файл можно было выбрать снова
            }}
          />
        </label>
      </div>

      {/* ───────── ПРЕДПРОСМОТР ───────── */}
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

      {/* ───────── ДЕЙСТВИЯ ───────── */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[#E8DEEE] pt-6">
        <button
          type="button"
          onClick={save}
          disabled={busy || !draft.title.trim()}
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
            /* Опубликовать можно только пост с фотографией: без неё он на
               сайте всё равно не покажется (лента такие отсеивает), а
               галочка сбивала бы с толку — «поставил, а поста нет». */
            checked={draft.published && canPublish}
            disabled={!canPublish}
            onChange={(e) => set("published", e.target.checked)}
            className="h-5 w-5 accent-[#6B4E81]"
          />
          Виден на сайте
        </label>

        {!canPublish && (
          <span className="text-sm font-medium text-[#7E6E8A]">
            добавьте фото, чтобы опубликовать
          </span>
        )}

        <button type="button" onClick={onCancel} className={`${GHOST} ml-auto`}>
          Отмена
        </button>

        {draft.id && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className={`${BTN} inline-flex items-center gap-2 border border-[#E8C4CF] bg-white text-[#A64D6C] hover:bg-[#FBEEF2]`}
          >
            <Trash2 className="h-5 w-5" />
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── 4. РАБОЧИЙ СТОЛ ──────────────────────── */

function Workbench() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [current, setCurrent] = useState<Post | null>(null);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      setPosts(await fetchPosts(true)); // с черновиками
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось прочитать посты");
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <Shell
      action={
        <button
          type="button"
          onClick={() => supabase!.auth.signOut()}
          className={`${GHOST} inline-flex items-center gap-2`}
        >
          <LogOut className="h-5 w-5" />
          Выйти
        </button>
      }
    >
      {err && <div className="mb-6">{<Err text={err} />}</div>}

      <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* СПИСОК */}
        <div>
          <button
            type="button"
            onClick={() => setCurrent(blankPost())}
            className={`${PRIMARY} mb-4 inline-flex w-full items-center justify-center gap-2`}
          >
            <Plus className="h-5 w-5" />
            Новый пост
          </button>

          {posts === null ? (
            <p className="text-[15px] font-medium text-[#7E6E8A]">Читаем…</p>
          ) : posts.length === 0 ? (
            <p className="text-[15px] font-medium text-[#7E6E8A]">
              Постов пока нет. Первый — кнопкой выше.
            </p>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setCurrent(p)}
                    className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                      current?.id === p.id
                        ? "border-[#6B4E81] bg-[#F8F4F9]"
                        : "border-[#E8DEEE] bg-white hover:bg-[#FBF7FC]"
                    }`}
                  >
                    <span className="block text-[15px] font-semibold text-[#2D2433]">
                      {p.title || "Без заголовка"}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-[#7E6E8A]">
                      {p.date} · {p.photos.length} фото
                      {!p.published && " · черновик"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ФОРМА */}
        <div>
          {current ? (
            <Editor
              /* key по id: при переключении на другой пост форма создаётся
                 заново, иначе в ней остались бы поля предыдущего. */
              key={current.id || "new"}
              post={current}
              onSaved={(p) => {
                setCurrent(p);
                reload();
              }}
              onDeleted={() => {
                setCurrent(null);
                reload();
              }}
              onCancel={() => setCurrent(null)}
            />
          ) : (
            <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
              Выберите пост слева или создайте новый.
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ─────────────────────────── ТОЧКА ВХОДА ─────────────────────────── */

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isConfigured);

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
  return <Workbench />;
}
