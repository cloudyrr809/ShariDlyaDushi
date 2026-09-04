import { supabase, BUCKET } from "./supabase";

/* ─────────────────────────── КАРТИНКИ САЙТА ───────────────────────────

   Один загрузчик на все разделы: посты «Ленты», карточки каталога и
   услуги. Раньше он жил внутри lib/feed.ts, но к нему добавились каталог
   и услуги, и держать общий код в файле одного раздела стало странно.

   Все файлы лежат в одной папке хранилища: разделять их незачем, имена
   случайные и не пересекаются, а правила доступа пришлось бы описывать
   для каждой папки заново. */

/** Дальняя сторона кадра после сжатия. 1600px хватает и просмотрщику на
    десктопе, а вес снимка с телефона падает с 3–5 МБ до ~250 КБ. На
    бесплатном тарифе это разница между 250 фотографиями и тысячами. */
const MAX_SIDE = 1600;

/** Качество JPEG при пересжатии. 0.82 — артефактов на фотографиях не
    видно, а вес вдвое меньше, чем при 0.92. */
const QUALITY = 0.82;

/** Уже лёгкие картинки не трогаем: повторное кодирование только портит. */
const SKIP_UNDER = 600 * 1024;

/** Кадр: адрес и настоящие пропорции. Размеры не обязательны — у старых
    картинок из папки assets их нет, тогда браузер выясняет их сам. */
export type Shot = { src: string; w?: number; h?: number; caption?: string };

type Prepared = { body: Blob; w: number; h: number; ext: string; type: string };

/**
 * Готовит снимок к отправке: ужимает до web-размера и снимает пропорции.
 *
 * Пропорции нужны в базе — на них держится раскладка коллажа, и без них
 * страница на мгновение считала бы кадр горизонтальным 3:2. Сжатие и
 * замер идут за один проход по картинке.
 *
 * PNG и прочие форматы пересжимаются в JPEG: на сайте одни фотографии,
 * прозрачность там не нужна, а PNG с телефона весит втрое больше.
 * Если картинку не удалось декодировать (сбой canvas на старом мобильном
 * Safari, редкий формат) — отдаём файл как есть: пусть лучше тяжёлый
 * снимок, чем оборванная загрузка.
 */
function prepare(file: File): Promise<Prepared> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Не удалось прочитать ${file.name}`));
    };

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: nw, naturalHeight: nh } = img;

      const asIs: Prepared = {
        body: file,
        w: nw,
        h: nh,
        ext: file.name.split(".").pop()?.toLowerCase() || "jpg",
        type: file.type || "image/jpeg",
      };

      const scale = Math.min(1, MAX_SIDE / Math.max(nw, nh));
      const fits = scale === 1;

      // Маленькая и лёгкая — отправляем оригинал без пересжатия.
      if (fits && file.size < SKIP_UNDER) {
        resolve(asIs);
        return;
      }

      const w = Math.round(nw * scale);
      const h = Math.round(nh * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(asIs);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          // Не получилось сжать, или при том же размере вышло тяжелее —
          // берём оригинал.
          if (!blob || (fits && blob.size >= file.size)) {
            resolve(asIs);
          } else {
            resolve({ body: blob, w, h, ext: "webp", type: "image/webp" });
          }
        },
        // WebP, а не JPEG: при том же качестве весит вчетверо меньше и
        // умеет прозрачность. Поддержан всеми браузерами с 2020 года —
        // и теми же, в которых работает сам холст с toBlob.
        "image/webp",
        QUALITY,
      );
    };

    img.src = url;
  });
}

/** Переводит СТАРЫЕ локальные пути на .webp.

    Карточки, перенесённые в базу до конвертации, хранят пути вида
    «/assets/num_1300.jpg» — файлов с такими именами больше нет. Адреса
    хранилища (начинаются с http) не трогаем: там лежит то, что загрузили
    через админку, и оно всегда актуально. */
export const localWebp = (src: string): string =>
  src.startsWith("/assets/") ? src.replace(/\.(jpe?g|png)$/i, ".webp") : src;

/** Кладёт картинку в хранилище и возвращает кадр с адресом и размерами. */
export async function uploadImage(file: File): Promise<Shot> {
  if (!supabase) throw new Error("База не подключена");

  const { body, w, h, ext, type } = await prepare(file);

  /* Имя файла придумываем сами, а не берём исходное: у снимков с телефона
     они повторяются (IMG_0001.jpg), и второй затёр бы первый. */
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    cacheControl: "31536000",
    contentType: type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { src: data.publicUrl, w, h };
}

/** Убирает файл из хранилища, чтобы удалённые кадры не копились впустую. */
export async function removeImage(src: string): Promise<void> {
  if (!supabase) return;
  const at = src.indexOf(`/${BUCKET}/`);
  if (at === -1) return; // не наш файл — например, картинка из папки assets
  const path = src.slice(at + BUCKET.length + 2);
  await supabase.storage.from(BUCKET).remove([path]);
}
