/* Перегоняет картинки проекта в WebP.
 *
 *   node scripts/to-webp.mjs           — только показать, что будет сделано
 *   node scripts/to-webp.mjs --write   — переписать файлы
 *
 * Нужен ffmpeg в PATH (или задайте путь переменной FFMPEG).
 *
 * Почему так, а не «сжать посильнее»: половина веса — не формат, а размер.
 * Файлы лежат по 3000-4000px по стороне, а на экране занимают 600-1200.
 * Поэтому сначала масштаб под потолок, и только потом кодек.
 *
 * Потолки разные: фотографии видны во всю ширину экрана, значки и шары —
 * это картинки величиной с ноготь, им хватает 800px с запасом на retina.
 *
 * Прозрачность WebP держит полностью, поэтому шары и значки памятки
 * переживают конвертацию без изменений. Доли обрезки в constants.ts
 * считаются от кадра, а не в пикселях, — масштабирование их не двигает.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { join, extname, basename, dirname } from "node:path";

const FFMPEG = process.env.FFMPEG || "ffmpeg";
const WRITE = process.argv.includes("--write");

/** Потолок по ДЛИННОЙ стороне и качество: [макс. сторона, quality].
 *
 *  Именно по длинной. Потолок по ширине оставлял вертикальный кадр
 *  1809×2560 в 2560 точек высоты: 248 КБ на диске, но 45 мс на
 *  декодирование против 20 у горизонтального соседа. */
const RULES = [
  [/[\\/]memo[\\/]/, 800, 90], // значки памятки: мелкие, но с чёткими краями
  [/ballon\d\./, 700, 90], // шары-украшения
  [/back|hero|logo/, 1920, 82], // фоны во всю ширину экрана
  [/\.png$/, 1200, 88],
  [/\.(jpe?g|webp)$/, 1600, 82],
];

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

const files = ["public/assets", "src/assets"]
  .filter(existsSync)
  .flatMap(walk)
  .filter((f) => /\.(jpe?g|png)$/i.test(f));

let before = 0;
let after = 0;
const rows = [];

for (const file of files) {
  const rule = RULES.find(([re]) => re.test(file.replace(/\\/g, "/")));
  const [, maxSide, quality] = rule ?? [null, 1920, 82];
  const out = join(dirname(file), basename(file, extname(file)) + ".webp");

  const src = statSync(file).size;
  before += src;

  if (WRITE) {
    execFileSync(FFMPEG, [
      "-y", "-v", "error",
      "-i", file,
      // min по обеим сторонам + decrease = вписать в квадрат maxSide,
      // сохранив пропорции и не растянув то, что и так меньше
      "-vf",
      `scale=w='min(${maxSide},iw)':h='min(${maxSide},ih)':force_original_aspect_ratio=decrease:flags=lanczos`,
      "-quality", String(quality),
      "-compression_level", "6",
      out,
    ]);
    rmSync(file);
  }

  const dst = WRITE ? statSync(out).size : 0;
  after += dst;
  rows.push([file, src, dst]);
}

rows
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([f, s, d]) =>
    console.log(
      `${(s / 1024).toFixed(0).padStart(6)} KB → ${(d / 1024).toFixed(0).padStart(6)} KB  ${f}`,
    ),
  );

console.log(
  `\n${files.length} файлов: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB` +
    (WRITE ? ` (−${(100 - (after / before) * 100).toFixed(0)}%)` : "  (пробный прогон, --write чтобы применить)"),
);
