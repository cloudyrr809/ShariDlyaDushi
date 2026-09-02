import { useEffect, useRef, useState } from "react";

import { careCards } from "../../constants";

// Карточки выходят одна за другой. Внутри каждой слои (картинка, заголовок,
// текст) догоняют её с небольшим запозданием — это и даёт ощущение глубины.
// Скорость примерно как в прошлый раз (вдвое быстрее исходных 950/620/150),
// но движение мягче. «Резко» получалось из-за кривой cubic-bezier(0.16,1,…):
// она выходила почти на максимум уже к трети времени — элемент влетал и
// замирал. Кривая ниже разгоняется и тормозит плавно, а сама анимация
// стала чуть длиннее, чтобы глаз успевал за ней.
const REVEAL_MS = 720; // длительность появления карточки
const STEP_MS = 300; // пауза между стартами соседних карточек
const LAYER_MS = 90; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.33, 0, 0.2, 1)"; // плавный старт и плавное торможение

// Габариты области под картинку: содержимое вписывается сюда с сохранением
// пропорций, поэтому широкая машина и узкий шарик смотрятся соразмерно.
// Иконки занимают почти всю область MEDIA_H, чтобы карточки не пустовали.
// Пара стоит чуть мельче: две картинки должны уместиться по ширине даже
// на телефоне с учётом наклона ±7°.
const SOLO = { h: 172, w: 250 };
const PAIR = { h: 140, w: 124 };

type Img = {
  src: string;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  ar: number;
  bleed?: "top" | "bottom";
  headFrac?: number;
};

/**
 * Единая высота области под картинку. Заголовки всех карточек встают на одну
 * линию, какой бы ни была картинка: обычная иконка, шар во всю ширину сверху
 * или крупный шар, у которого лента уходит вниз за текст.
 * 175 + падинг 28 = 203 — ровно натуральная высота верхнего шара на десктопе.
 */
const MEDIA_H = 175;

/** Картинка, обрезанная по своему содержимому: прозрачные поля уходят за край. */
const Cropped = ({ img, className }: { img: Img; className?: string }) => (
  <img
    src={img.src}
    alt=""
    aria-hidden="true"
    loading="lazy"
    className={`absolute max-w-none select-none ${className ?? ""}`}
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

  /* КАЖДАЯ КАРТОЧКА ПОЯВЛЯЕТСЯ САМА, а не все шестеро по одному сигналу.

     Раньше наблюдение шло за всей сеткой: стоило ей краем показаться на
     экране — и запускался общий каскад с шагом в 300 мс. На широком
     экране это две строки по три, каскад укладывается в секунду и его
     видно целиком. На телефоне же колонка ОДНА, сетка высотой в две
     тысячи пикселей: каскад отыгрывал где-то внизу, за краем экрана, и
     до нижних карточек человек долистывал уже к пустым местам —
     карточки занимали высоту, но были прозрачными.

     Значение в словаре — задержка карточки внутри той пачки, в которой
     она показалась. На широком экране строка выезжает целиком, пачка из
     трёх, и каскад остаётся прежним. На телефоне карточка приходит одна,
     пачка из одной, задержки нет — она проявляется сразу. Ширину экрана
     при этом знать не нужно, всё решает сам факт появления. */
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
          .map((e) => Number((e.target as HTMLElement).dataset.card));
        if (!hit.length) return;

        setDelays((prev) => {
          const next = { ...prev };
          hit.forEach((i, k) => {
            if (!(i in next)) next[i] = k * STEP_MS;
          });
          return next;
        });
        // Показанную карточку больше не наблюдаем: эффект одноразовый
        hit.forEach((i) => {
          const el = cardRefs.current[i];
          if (el) io.unobserve(el);
        });
      },
      { threshold: 0.15 },
    );

    cardRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Размытие на входе — только там, где есть чем его считать. Переход
     фильтра заставляет перерисовывать карточку каждый кадр, и на
     телефоне шесть таких переходов подряд заметно дёргаются. */
  const softBlur = useRef(
    typeof window !== "undefined" &&
      !window.matchMedia("(hover: none)").matches,
  ).current;

  // общий помощник: плавный выход слоя с собственной задержкой
  const layer = (idx: number, step: number, hidden: string) => ({
    opacity: isShown(idx) ? 1 : 0,
    transform: isShown(idx) ? "none" : hidden,
    transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
    transitionDelay: isShown(idx) ? `${delays[idx] + step}ms` : "0ms",
  });

  return (
    <section className="bg-[#F8F4F9] px-6 py-20">
      <div className="mx-auto max-w-[76rem]">
        <h2 className="text-center font-serif text-3xl font-semibold text-[#2D2433] md:text-5xl">
          Памятка по обращению с шарами
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-base font-medium text-[#5A4D66]">
          Несколько простых правил — и шарики будут летать очень долго!
        </p>

        {/* Три карточки в ряд, во втором ряду ещё три */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {careCards.map((card, idx) => {
            const top = card.images.find((i) => i.bleed === "top");
            const bottom = card.images.find((i) => i.bleed === "bottom");
            const inline = card.images.filter((i) => !i.bleed);
            const box = inline.length > 1 ? PAIR : SOLO;

            return (
              <div
                key={card.title}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                data-card={idx}
                className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-[#E8DEEE] bg-white p-7 text-center"
                style={{
                  opacity: isShown(idx) ? 1 : 0,
                  transform: isShown(idx)
                    ? "none"
                    : "translateY(22px) scale(0.975)",
                  filter: !softBlur || isShown(idx) ? "blur(0px)" : "blur(3.5px)",
                  boxShadow: isShown(idx)
                    ? "0 18px 40px -28px rgba(107,78,129,0.45)"
                    : "0 0 0 rgba(107,78,129,0)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}, filter ${REVEAL_MS}ms ${EASE}, box-shadow ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: isShown(idx) ? `${delays[idx]}ms` : "0ms",
                }}
              >
                {/* Шар, прижатый к верхней кромке карточки во всю её ширину.
                    Абсолютный, чтобы не влиять на поток: место под него держит
                    общая распорка MEDIA_H, поэтому заголовок не съезжает. */}
                {top && (
                  <>
                    <div
                      // overflow-hidden убран намеренно: он резал шар по
                      // нижней кромке своего бокса, когда тот подрастал при
                      // наведении. Прятать им нечего — содержимое картинки
                      // ровно совпадает с боксом, ниже идут только прозрачные
                      // поля PNG. Границы карточки всё равно обрезают лишнее.
                      className="memo-figure memo-figure--top absolute top-0 left-0 z-0 w-full"
                      style={{
                        aspectRatio: `${top.ar}`,
                        ...layer(idx, LAYER_MS, "translateY(-9px) scale(1.025)"),
                      }}
                    >
                      <Cropped img={top} />
                    </div>
                    <div aria-hidden="true" style={{ height: MEDIA_H }} />
                  </>
                )}

                {/* Крупный шар: сам шар занимает ту же область MEDIA_H, а лента
                    продолжается вниз и проходит позади текста (z-0 против z-10).
                    Высоту считаем от доли шара headFrac, замеренной по альфе. */}
                {bottom && (
                  <>
                    <div
                      className="memo-figure pointer-events-none absolute top-7 left-1/2 z-0 -translate-x-1/2"
                      style={{
                        height: MEDIA_H / (bottom.headFrac ?? 0.667),
                        aspectRatio: `${bottom.ar}`,
                        ...layer(idx, LAYER_MS, "translateY(10px) scale(0.955)"),
                      }}
                    >
                      <div className="relative h-full w-full">
                        <Cropped img={bottom} />
                        {/* Зона наведения только по самому шару. Габарит
                            обёртки тянется вниз вместе с лентой и накрывает
                            пустое место сбоку от текста — без этой заглушки
                            шар подпрыгивал бы от наведения на пустоту.
                            pointer-events-none у родителя не мешает: потомок
                            с auto остаётся целью, и :hover доходит до него. */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-auto absolute inset-x-0 top-0"
                          style={{ height: `${(bottom.headFrac ?? 0.667) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div aria-hidden="true" style={{ height: MEDIA_H }} />
                  </>
                )}

                {/* Обычные иконки — прижаты к низу той же области */}
                {inline.length > 0 && (
                  <div
                    className="flex items-end justify-center gap-4"
                    style={{
                      height: MEDIA_H,
                      ...layer(idx, LAYER_MS, "translateY(9px) scale(0.94)"),
                    }}
                  >
                    {inline.map((img, i) => {
                      const byWidth = img.ar > box.w / box.h;
                      const w = byWidth ? box.w : box.h * img.ar;
                      const h = byWidth ? box.w / img.ar : box.h;

                      return (
                        <div
                          key={img.src}
                          // без overflow-hidden: при повороте ±7° клипирование
                          // срезало шар по краям (сверху/сбоку). Прозрачные поля
                          // PNG всё равно невидимы, а внешняя карточка обрезает
                          // всё лишнее по своему скруглённому краю.
                          // memo-figure — наведение (см. index.css). Хит-зона
                          // равна этой обёртке, то есть видимому шару: у пары
                          // прозрачные поля картинок перекрываются, и ловить
                          // наведение самой картинкой нельзя.
                          className="memo-figure relative"
                          style={{
                            width: w,
                            height: h,
                            transform:
                              inline.length > 1
                                ? `rotate(${i === 0 ? -7 : 7}deg)`
                                : undefined,
                          }}
                        >
                          <Cropped img={img} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Текст поверх ленты */}
                <h4
                  className="relative z-10 mt-5 font-serif text-base font-semibold text-[#2D2433]"
                  style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                >
                  {card.title}
                </h4>
                <p
                  className="relative z-10 mt-2 text-sm font-medium leading-relaxed text-[#5A4D66]"
                  style={layer(idx, LAYER_MS * 3, "translateY(8px)")}
                >
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
