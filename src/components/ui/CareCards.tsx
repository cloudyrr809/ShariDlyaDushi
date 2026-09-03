import { useEffect, useRef, useState } from "react";

import { careCards } from "../../constants";

/* ═════════════════════ ПАМЯТКА ПО ОБРАЩЕНИЮ С ШАРАМИ ═════════════════════

   Шесть правил компактными карточками: значок слева, правило справа.

   Строгая сетка 3×2: два ряда по три равноправные карточки. Прежние
   широкие карточки на две и три колонки разваливали ряд и растягивали
   памятку на три этажа.

   Колонки при этом чуть неровные (1.035 / 0.965 / 1 доли) — разброс
   ширины 28px из 400. Сетка от этого остаётся сеткой 3×2, просто ряд не
   выглядит отмеренным по линейке.

   ВНУТРИ карточки раскладка горизонтальная: значок 56px слева, правило
   справа. Картинка во всю ширину съедала полторы сотни пикселей высоты и
   отодвигала текст, ради которого карточка и стоит. Вся памятка от
   надстрочки до низа второго ряда укладывается примерно в 400px.
   ───────────────────────────────────────────────────────────────────────── */

// Карточки выходят РЯДАМИ: сначала верхний ряд целиком, потом следующий.
const REVEAL_MS = 720; // длительность появления карточки
const ROW_MS = 280; // пауза между рядами, если оба вышли на экран разом
const LAYER_MS = 90; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.33, 0, 0.2, 1)"; // плавный старт и плавное торможение

/* Плитка под картинкой — квадрат 56×56 у всех карточек без исключения.
   Иллюстрация в ней работает как значок при тексте, а не как картина: за
   этим карточки и стали компактными.

   Картинка ВПИСЫВАЕТСЯ в габарит с сохранением пропорций и ничем не
   обрезается — между габаритом и кромкой плитки всегда остаётся воздух.

   Считаем от ВИДИМОГО содержимого, а не от кадра файла. У PNG вокруг шара
   свои прозрачные поля — от 61% кадра до 93%, — и «вписать по файлу»
   означало бы, что один значок занимает плитку целиком, а соседний
   болтается в ней вдвое мельче. Ровно ту разнокалиберность плитка и
   призвана убрать. */
const TILE = 56;
const SOLO = { h: 42, w: 46 };
// Пара умещается в ту же плитку: две картинки по ширине, с наклоном ±7°
const PAIR = { h: 36, w: 21 };

/* Пастельные подложки по кругу — три оттенка, чтобы шесть плиток подряд не
   читались как одна повторённая. */
const PLINTHS = [
  "bg-gradient-to-br from-[#F1E7F8] to-[#FBF3F7]",
  "bg-gradient-to-br from-[#FBEFF5] to-[#F3ECFA]",
  "bg-gradient-to-br from-[#ECE4F7] to-[#FAF4FB]",
];

type Img = {
  src: string;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  ar: number;
};

/** Картинка, обрезанная по своему содержимому: прозрачные поля уходят за
    край обёртки, а сама обёртка и есть видимый шар. */
const Cropped = ({ img }: { img: Img }) => (
  <img
    src={img.src}
    alt=""
    aria-hidden="true"
    loading="lazy"
    className="absolute max-w-none select-none"
    style={{
      width: `${100 / img.fw}%`,
      height: `${100 / img.fh}%`,
      left: `${(-img.fx / img.fw) * 100}%`,
      top: `${(-img.fy / img.fh) * 100}%`,
    }}
  />
);

export const CareCards = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* Отслеживание ширины экрана убрано: плитка со значком теперь одна на
     все карточки (72×72), и подбирать габарит под брейкпоинт больше
     незачем — разницу между карточками делает сетка, а не размер
     картинки. */

  /* ПОЯВЛЕНИЕ ПО РЯДАМ.

     Наблюдаем каждую карточку отдельно, но задержку назначаем не ей, а её
     РЯДУ. Ряд определяем по фактической геометрии — offsetTop, — а не по
     номеру карточки: в bento-сетке ряды разной длины, и «каждые три
     подряд» означало бы совсем не то, что видит глаз. */
  const [delays, setDelays] = useState<Record<number, number>>({});
  const isShown = (i: number) => i in delays;

  useEffect(() => {
    const all = careCards.map((_, i) => i);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDelays(Object.fromEntries(all.map((i) => [i, 0])));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .map((e) => {
            const el = e.target as HTMLElement;
            // Округляем до 8px: карточки одного ряда стоят на одной линии,
            // но дробные значения после масштабирования страницы могут
            // разойтись на пиксель-другой.
            return {
              i: Number(el.dataset.card),
              row: Math.round(el.offsetTop / 8),
            };
          });
        if (!hit.length) return;

        const rows = [...new Set(hit.map((h) => h.row))].sort((a, b) => a - b);

        setDelays((prev) => {
          const next = { ...prev };
          hit.forEach(({ i, row }) => {
            if (!(i in next)) next[i] = rows.indexOf(row) * ROW_MS;
          });
          return next;
        });

        // Показанную карточку больше не наблюдаем: эффект одноразовый
        hit.forEach(({ i }) => {
          const el = cardRefs.current[i];
          if (el) io.unobserve(el);
        });
      },
      { threshold: 0.15 },
    );

    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // общий помощник: плавный выход слоя с собственной задержкой
  const layer = (idx: number, step: number, hidden: string) => ({
    opacity: isShown(idx) ? 1 : 0,
    transform: isShown(idx) ? "none" : hidden,
    transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
    transitionDelay: isShown(idx) ? `${delays[idx] + step}ms` : "0ms",
  });

  return (
    <section className="relative overflow-hidden bg-[#F8F4F9] px-6 py-10 md:py-12">
      {/* ЦВЕТНЫЕ ПЯТНА ПОД КАРТОЧКАМИ. Без них стекло не работает:
          полупрозрачный белый поверх ровной заливки — это просто белый. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-[#D9A7C0]/25 blur-[110px]" />
        <div className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-[#6B4E81]/16 blur-[130px]" />
        <div className="absolute -bottom-28 left-1/4 h-[400px] w-[400px] rounded-full bg-[#C9A6E0]/22 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[76rem]">
        <p className="font-miana pb-[0.55em] text-center text-xl leading-none text-[#C46B8A] md:text-2xl">
          бережно
        </p>

        <h2 className="text-center text-[1.6rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.1rem] md:leading-[1.12]">
          Памятка по обращению с шарами
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed font-medium text-[#5A4D66] md:text-base">
          Несколько простых правил — и шарики будут летать очень долго!
        </p>

        {/* СТРОГАЯ СЕТКА 3×2. Никаких объединений колонок: все шесть
            карточек — равноправные ячейки по одной колонке, два ряда по
            три. Прежние широкие карточки на две и три колонки ломали ряд
            и разваливали памятку на три этажа.

            Колонки чуть неровные — 1.035 / 0.965 / 1 доли вместо трёх
            ровных. Это по-прежнему repeat(3): три колонки, два ряда,
            каждая карточка в своей ячейке. Разброс ширины 28px из 400 —
            ряд просто не выглядит отмеренным по линейке.

            Одной записью grid-template-columns, без grid-cols-3: обе
            задают одно свойство, и короткая утилита в собранном файле
            оказывалась ниже — три ровные колонки затирали неровные.

            Высота ряда общая у всех трёх карточек: сетка по умолчанию
            тянет ячейки на всю строку (align-items: stretch), поэтому
            плашка у одной из них не делает её выше соседок. */}
        <div className="scrollbar-hide -mx-6 mt-6 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-6 pt-1 pb-6 md:mx-0 md:grid md:gap-3.5 md:overflow-visible md:px-0 md:pb-1 md:[grid-template-columns:1.035fr_0.965fr_1fr]">
          {careCards.map((card, idx) => {
            const pair = card.images.length > 1;
            const box = pair ? PAIR : SOLO;

            return (
              /* Внешняя обёртка держит ПОЯВЛЕНИЕ и место в сетке, внутренняя —
                 наведение. Разделено намеренно: появление пишет transform
                 инлайном, а инлайновый стиль сильнее классов — подъём при
                 наведении на той же ноде просто не сработал бы. */
              <div
                key={card.title}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                data-card={idx}
                className="w-[86%] shrink-0 snap-center sm:w-[56%] md:w-auto"
                style={{
                  opacity: isShown(idx) ? 1 : 0,
                  transform: isShown(idx)
                    ? "none"
                    : "translateY(18px) scale(0.98)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: isShown(idx) ? `${delays[idx]}ms` : "0ms",
                }}
              >
                {/* МАТОВОЕ СТЕКЛО. У карточки со смысловым акцентом
                    подложка своя — сиреневая: после перехода на строгую
                    сетку это единственный способ её выделить, размером и
                    местом в ряду там уже не выделишь.

                    items-center, а не items-start: значок 56px и текст в
                    две-три строки — примерно одной высоты, и по центру они
                    стоят ровнее, чем прижатые к верху. */}
                <article
                  className={`memo-card flex h-full flex-row items-center gap-3 rounded-[18px] border border-white/80 px-4 py-3 shadow-[0_8px_22px_-10px_rgba(100,60,140,0.12)] transition duration-500 ease-out md:backdrop-blur-md md:hover:-translate-y-1 md:hover:border-white md:hover:shadow-[0_16px_34px_-14px_rgba(100,60,140,0.22)] ${
                    card.accent
                      ? "bg-[#EFE4F8]/70 md:hover:bg-[#EFE4F8]/85"
                      : "bg-white/65 md:hover:bg-white/80"
                  }`}
                >
                  {/* ПЛИТКА СО ЗНАЧКОМ — то, что сводит разные иллюстрации
                      к одному виду: один размер, одна форма, мягкий
                      пастельный градиент.

                      shrink-0 обязателен: без него флекс ужимал бы квадрат
                      под длинный текст рядом, и плитки перестали бы быть
                      одинаковыми — то есть ровно то, ради чего они есть. */}
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-xl ${PLINTHS[idx % PLINTHS.length]}`}
                    style={{
                      width: TILE,
                      height: TILE,
                      ...layer(idx, LAYER_MS, "translateY(6px) scale(0.9)"),
                    }}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      {card.images.map((img, i) => {
                        // Вписываем по той стороне, которая упирается первой
                        const byWidth = img.ar > box.w / box.h;
                        const w = byWidth ? box.w : box.h * img.ar;
                        const h = byWidth ? box.w / img.ar : box.h;

                        return (
                          <div
                            key={img.src}
                            /* без overflow-hidden: при повороте ±7° и при
                               подъёме на наведении клипирование срезало бы
                               шар по краям.
                               memo-figure — левитация, см. index.css. */
                            className="memo-figure relative"
                            style={{
                              width: w,
                              height: h,
                              transform: pair
                                ? `rotate(${i === 0 ? -7 : 7}deg)`
                                : undefined,
                            }}
                          >
                            <Cropped img={img} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ТЕКСТ. min-w-0 обязателен флекс-ребёнку с текстом: без
                      него длинное слово распирает колонку и выдавливает
                      значок из карточки. */}
                  <div className="flex min-w-0 flex-1 flex-col text-left">
                    {/* Плашка стоит В СТРОКУ с заголовком, а не над ним, и
                        только у двух карточек из шести. Отдельной строкой
                        она делала бы эти две выше соседок — а высоту ряда
                        задаёт самая высокая карточка, и разъезжались бы
                        все три. */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-[#2D2433]">
                        {card.title}
                      </h3>

                      {card.tag && (
                        <span
                          className={`inline-block shrink-0 rounded-full border px-2 py-px text-[13px] font-bold tracking-[0.08em] uppercase ${
                            card.accent
                              ? "border-[#D9C2EA] bg-white/70 text-[#513A6B]"
                              : "border-[#EADFF2] bg-white/70 text-[#6B4E81]"
                          }`}
                        >
                          {card.tag}
                        </span>
                      )}
                    </div>

                    <p className="mt-[3px] text-[13px] leading-[1.35] font-medium text-[#4A3A5C]">
                      {card.description}
                    </p>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
