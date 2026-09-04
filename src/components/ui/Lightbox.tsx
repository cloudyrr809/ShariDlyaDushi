import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/* Тип кадра живёт рядом с загрузчиком (lib/media): им пользуются и лента,
   и каталог, и услуги, а не только просмотрщик. Здесь переэкспорт, чтобы
   не переписывать импорты по всему проекту. */
export type { Shot } from "../../lib/media";
import type { Shot } from "../../lib/media";
import { pauseSmoothScroll } from "../../lib/smoothScroll";

/** Насколько далеко надо провести пальцем, чтобы это засчиталось за
    перелистывание, а не за дрожание руки при обычном тапе. */
const SWIPE = 48;

/**
 * Просмотрщик фотографий: открывает снимок поверх страницы и позволяет
 * листать серию.
 *
 * Снимок показывается ЦЕЛИКОМ (object-contain) и не крупнее своего
 * настоящего размера — растянутая вверх фотография выглядит мыльной.
 *
 * Раскладка — колонка: полоса с названием сверху, снимок посередине,
 * подпись и превью снизу. Раньше всё это висело на absolute поверх
 * снимка; с подписью и полоской превью такой способ начал бы их друг на
 * друга накладывать.
 */
export function Lightbox({
  shots,
  index,
  title,
  onClose,
  onIndex,
}: {
  shots: Shot[];
  /** null — просмотрщик закрыт */
  index: number | null;
  /** Заголовок поста, из которого открыли серию. */
  title?: string;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const open = index !== null;
  const total = shots.length;

  const go = useCallback(
    (step: number) => {
      if (index === null) return;
      onIndex((index + step + total) % total);
    },
    [index, total, onIndex],
  );

  // Клавиатура: Esc закрывает, стрелки листают.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go]);

  /* Блокируем прокрутку страницы под оверлеем.
     Компенсируем ширину исчезнувшей полосы прокрутки паддингом: без
     этого при открытии вся страница дёргается вправо на её ширину. */
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    // Плавная прокрутка про overflow на теле не знает и продолжила бы
    // двигать страницу под просмотрщиком — замораживаем и её.
    const resume = pauseSmoothScroll();
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      resume();
    };
  }, [open]);

  /* ─── СВАЙП ───
     На телефоне стрелки — мелкая цель, а листать серию пальцем привычно
     по любому просмотрщику фотографий. */
  const touch = useRef<{ x: number; y: number } | null>(null);
  /* Свайп заканчивается обычным click по фону, а клик по фону закрывает
     просмотрщик — без этого флага каждое перелистывание пальцем тут же
     захлопывало бы окно. */
  const swiped = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    if (!from || total < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    // Короткое движение — это тап. Движение больше вертикальное, чем
    // горизонтальное, — это попытка прокрутки, а не листание.
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy)) return;
    swiped.current = true;
    go(dx < 0 ? 1 : -1);
  };

  /* Активное превью подтягиваем в видимую часть полоски: иначе в серии
     из десяти кадров текущий уезжает за край и непонятно, где ты. */
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    strip.current?.querySelector('[data-active="true"]')?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [open, index]);

  if (!open || index === null) return null;
  const shot = shots[index];

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  /* РИСУЕМ В <body>, А НЕ НА МЕСТЕ ВЫЗОВА.

     position: fixed отмеряется от окна только до тех пор, пока НИ У ОДНОГО
     предка нет transform, filter или backdrop-filter: любое из них делает
     предка точкой отсчёта для fixed. На «Услугах» карточка обёрнута в
     animate-in ... fill-mode-both — анимация оставляет на элементе
     transform навсегда, — и просмотрщик прижимался к её контейнеру
     max-w-[79rem]: тёмная подложка не доходила до краёв экрана, по бокам
     оставались светлые полосы, а снимок сидел не по центру окна.

     Портал в body уносит окно из-под любых таких предков разом, поэтому
     чинит не только «Услуги», но и всякое следующее место вызова. */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Фотография ${index + 1} из ${total}`}
      className="fixed inset-0 z-[100] flex flex-col bg-[#1C1522]/95 backdrop-blur-sm"
      onClick={() => {
        // Клик, которым закончился свайп, закрывать не должен
        if (swiped.current) {
          swiped.current = false;
          return;
        }
        onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ВЕРХНЯЯ ПОЛОСА: откуда снимок и какой он по счёту */}
      <div className="flex shrink-0 items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div onClick={stop}>
          {title && (
            <p className="text-[15px] leading-snug font-semibold text-white">
              {title}
            </p>
          )}
          {total > 1 && (
            <p className="mt-1 text-sm font-semibold tracking-widest text-white/60 uppercase">
              {index + 1} / {total}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/12 text-white transition hover:bg-white/25"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* СНИМОК. min-h-0 обязателен: без него flex-элемент не даёт себя
          сжать, и картинка выдавливает полоску превью за нижний край. */}
      {/* ЛИСТАТЬ МОЖНО ВСЕЙ ПУСТОТОЙ ПО БОКАМ, а не только стрелкой.

          Раньше кнопки были кружками 48px — в них надо было попасть. Теперь
          это две колонки во всю высоту снимка: слева треть, справа треть.
          Стрелка внутри осталась, но она уже подсказка, а не мишень.

          Снимок лежит выше кнопок (z-20 против z-10), поэтому клик по
          самой фотографии ничего не листает — там и должно быть тихо.
          Закрыть по-прежнему можно щелчком выше или ниже снимка, крестиком
          и клавишей Esc. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                go(-1);
              }}
              aria-label="Предыдущая фотография"
              className="group absolute inset-y-0 left-0 z-10 flex w-1/3 cursor-pointer items-center justify-start pl-2 md:pl-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white transition group-hover:bg-white/25">
                <ChevronLeft className="h-7 w-7" />
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                go(1);
              }}
              aria-label="Следующая фотография"
              className="group absolute inset-y-0 right-0 z-10 flex w-1/3 cursor-pointer items-center justify-end pr-2 md:pr-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white transition group-hover:bg-white/25">
                <ChevronRight className="h-7 w-7" />
              </span>
            </button>
          </>
        )}

        <img
          decoding="async"
          src={shot.src}
          alt={shot.caption ?? `Фотография ${index + 1} из ${total}`}
          onClick={stop}
          className="relative z-20 max-h-full rounded-lg object-contain shadow-2xl"
          /* Не крупнее оригинала, но и не шире экрана: min из двух. Просто
             maxWidth: shot.w перебивал бы max-w-full, и на телефоне снимок
             вылезал бы за края. Поля в vw — чтобы по бокам всегда осталась
             полоса для листания, даже у широкого кадра. */
          style={{
            maxWidth: shot.w
              ? `min(calc(100% - 8rem), ${shot.w}px)`
              : "calc(100% - 8rem)",
          }}
        />
      </div>

      {/* ПОДПИСЬ К КАДРУ */}
      {shot.caption && (
        <p
          onClick={stop}
          className="mx-auto max-w-2xl shrink-0 px-6 pt-4 text-center text-[15px] leading-relaxed font-medium text-white/85"
        >
          {shot.caption}
        </p>
      )}

      {/* ПОЛОСКА ПРЕВЬЮ.
          Прокрутка на внешнем блоке, а центрирование — на внутреннем через
          w-max и mx-auto. Если поставить justify-center прямо на
          прокручиваемый блок, первые превью в длинной серии обрезаются и
          до них нельзя домотать. */}
      {total > 1 && (
        <div
          ref={strip}
          onClick={stop}
          className="shrink-0 overflow-x-auto overscroll-x-contain py-4"
        >
          <div className="mx-auto flex w-max gap-2 px-4">
            {shots.map((s, i) => (
              <button
                key={s.src + i}
                type="button"
                data-active={i === index}
                onClick={() => onIndex(i)}
                aria-label={`Перейти к фотографии ${i + 1}`}
                aria-current={i === index}
                className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg transition md:h-16 md:w-16 ${
                  i === index
                    ? "opacity-100 ring-2 ring-white"
                    : "opacity-45 hover:opacity-80"
                }`}
              >
                <img
                  src={s.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
