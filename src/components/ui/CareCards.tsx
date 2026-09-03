import { useEffect, useRef, useState } from "react";

import { careCards } from "../../constants";

/* ═════════════════════ ПАМЯТКА ПО ОБРАЩЕНИЮ С ШАРАМИ ═════════════════════

   Шесть правил в асимметричной сетке (bento): карточки разной ширины, а не
   шесть одинаковых квадратов. Разный размер здесь работает как иерархия —
   что крупнее, то важнее, — и заодно снимает монотонность, которой сетка
   2×3 страдала по построению.

   Раскладка на широком экране, три колонки:
     ряд 1   «Держите за ленту» на две колонки + «Убирайте от питомцев»
     ряд 2   три равные карточки
     ряд 3   «Не отпускайте в небо» во всю ширину, на своей подложке

   Широкие карточки развёрнуты горизонтально: текст слева, иллюстрация
   справа и крупно. Ради этого они и широкие — иначе лишняя ширина ушла бы
   в пустоту по бокам текста.

   Ширина задана в самих данных (span), а не таблицей по номеру карточки:
   порядок в памятке ещё поменяется, а привязка к индексу такое переживает
   молча и неверно.
   ───────────────────────────────────────────────────────────────────────── */

// Карточки выходят РЯДАМИ: сначала верхний ряд целиком, потом следующий.
const REVEAL_MS = 720; // длительность появления карточки
const ROW_MS = 280; // пауза между рядами, если оба вышли на экран разом
const LAYER_MS = 90; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.33, 0, 0.2, 1)"; // плавный старт и плавное торможение

/* Высота подложки и габариты картинки внутри неё. Две пары значений:
   обычная карточка и широкая, где иллюстрации отведено заметно больше
   места — она там главный герой, а не сопровождение к тексту.

   Картинка ВПИСЫВАЕТСЯ в габарит с сохранением пропорций и ничем не
   обрезается: подложка больше не режет содержимое по краю, у неё есть
   собственный внутренний отступ, и между габаритом и кромкой всегда
   остаётся воздух.

   Считаем от ВИДИМОГО содержимого, а не от кадра файла. У PNG вокруг шара
   свои прозрачные поля — от 61% кадра до 93%, — и «вписать по файлу»
   означало бы, что один шар занимает подложку целиком, а соседний
   болтается в ней вдвое мельче. Ровно ту разнокалиберность подложка и
   призвана убрать. */
const PLINTH = { normal: 168, wide: 236 };
const SOLO = { h: 128, w: 210 };
const PAIR = { h: 106, w: 92 };
const SOLO_WIDE = { h: 196, w: 290 };
const PAIR_WIDE = { h: 168, w: 146 };

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

  /* Крупные габариты картинок нужны только там, где карточка развёрнута
     горизонтально, а это происходит с md. Ниже md все карточки идут лентой
     одной ширины, и крупный габарит из неё бы вылез.

     matchMedia, а не resize: событие приходит один раз на пересечении
     порога, а не на каждый пиксель перетаскивания окна. Тот же приём, что
     в карусели на «О нас». */
  const [roomy, setRoomy] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setRoomy(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    <section className="relative overflow-hidden bg-[#F8F4F9] px-6 py-20 md:py-24">
      {/* ЦВЕТНЫЕ ПЯТНА ПОД КАРТОЧКАМИ. Без них стекло не работает:
          полупрозрачный белый поверх ровной заливки — это просто белый. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-[#D9A7C0]/25 blur-[110px]" />
        <div className="absolute top-1/3 -right-24 h-[460px] w-[460px] rounded-full bg-[#6B4E81]/16 blur-[130px]" />
        <div className="absolute -bottom-28 left-1/4 h-[400px] w-[400px] rounded-full bg-[#C9A6E0]/22 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[76rem]">
        <p className="font-miana pb-[0.5em] text-center text-2xl leading-none text-[#C46B8A] md:text-3xl">
          бережно
        </p>

        <h2 className="text-center text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
          Памятка по обращению с шарами
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
          Несколько простых правил — и шарики будут летать очень долго!
        </p>

        {/* ЛЕНТА ВБОК НА ТЕЛЕФОНЕ, BENTO-СЕТКА НА ДЕСКТОПЕ.
            Шесть карточек в столбик — это два экрана прокрутки ради
            памятки, мимо которой пролистывают. */}
        <div className="scrollbar-hide -mx-6 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pt-2 pb-8 md:mx-0 md:mt-14 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-2">
          {careCards.map((card, idx) => {
            const pair = card.images.length > 1;
            // Горизонтальная раскладка — только у широких карточек и только
            // там, где ширина реально есть.
            const horizontal = roomy && card.span > 1;
            const box = horizontal
              ? pair
                ? PAIR_WIDE
                : SOLO_WIDE
              : pair
                ? PAIR
                : SOLO;

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
                className={`w-[78%] shrink-0 snap-center sm:w-[52%] md:w-auto ${
                  card.span === 3
                    ? "md:col-span-3"
                    : card.span === 2
                      ? "md:col-span-2"
                      : ""
                }`}
                style={{
                  opacity: isShown(idx) ? 1 : 0,
                  transform: isShown(idx)
                    ? "none"
                    : "translateY(22px) scale(0.975)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: isShown(idx) ? `${delays[idx]}ms` : "0ms",
                }}
              >
                {/* МАТОВОЕ СТЕКЛО. У карточки со смысловым акцентом
                    подложка своя — сиреневая: выделяем не размером и не
                    рамкой, а тоном. */}
                <article
                  className={`memo-card flex h-full flex-col rounded-[26px] border border-white/80 p-6 shadow-[0_12px_32px_-8px_rgba(100,60,140,0.10)] transition duration-500 ease-out md:p-7 md:backdrop-blur-md md:hover:-translate-y-1.5 md:hover:border-white md:hover:shadow-[0_24px_48px_-12px_rgba(100,60,140,0.20)] ${
                    card.accent
                      ? "bg-[#EFE4F8]/70 md:hover:bg-[#EFE4F8]/85"
                      : "bg-white/65 md:hover:bg-white/80"
                  } ${
                    horizontal
                      ? "items-stretch md:flex-row-reverse md:items-center md:gap-8"
                      : "items-center text-center"
                  }`}
                >
                  {/* ПОДЛОЖКА ПОД КАРТИНКОЙ — то, что сводит разные
                      иллюстрации к одному виду.

                      overflow больше НЕ обрезает содержимое, а p-3 держит
                      воздух между картинкой и кромкой: раньше связка шаров
                      упиралась в край подложки и срезалась по нему. */}
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-[20px] p-3 ${PLINTHS[idx % PLINTHS.length]} ${
                      horizontal ? "md:w-[42%]" : "w-full"
                    }`}
                    style={{
                      height: horizontal ? PLINTH.wide : PLINTH.normal,
                      ...layer(idx, LAYER_MS, "translateY(10px) scale(0.94)"),
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
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

                  {/* ТЕКСТ. В широкой карточке уходит влево от иллюстрации
                      (сама карточка развёрнута flex-row-reverse) и
                      выключается по левому краю: по центру короткая строка
                      в широкой колонке разъезжается. */}
                  <div
                    className={
                      horizontal
                        ? "flex min-w-0 flex-1 flex-col items-start pt-6 text-left md:pt-0"
                        : "mt-6 flex flex-col items-center"
                    }
                  >
                    {/* Плашка стоит не у всех: у большинства карточек она
                        повторяла заголовок другими словами. Осталась там,
                        где ставит акцент, которого в заголовке нет. */}
                    {card.tag && (
                      <span
                        className={`mb-3.5 inline-block rounded-full border px-3.5 py-1 text-[13px] font-bold tracking-[0.12em] uppercase ${
                          card.accent
                            ? "border-[#D9C2EA] bg-white/70 text-[#513A6B]"
                            : "border-[#EADFF2] bg-white/70 text-[#6B4E81]"
                        }`}
                        style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                      >
                        {card.tag}
                      </span>
                    )}

                    <h3
                      className={`text-[1.0625rem] leading-snug font-bold tracking-[-0.01em] text-[#2D2433] md:text-lg ${
                        horizontal ? "md:text-2xl" : ""
                      }`}
                      style={layer(idx, LAYER_MS * 3, "translateY(8px)")}
                    >
                      {card.title}
                    </h3>

                    <p
                      className={`mt-2.5 text-[15px] leading-[1.6] font-medium text-[#4A3A5C] ${
                        horizontal ? "md:max-w-md md:text-base" : ""
                      }`}
                      style={layer(idx, LAYER_MS * 4, "translateY(8px)")}
                    >
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
