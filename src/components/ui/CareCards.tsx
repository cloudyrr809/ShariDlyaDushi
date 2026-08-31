import { useEffect, useRef, useState } from "react";

import { careCards } from "../../constants";

// Карточки выходят одна за другой. Внутри каждой слои (картинка, заголовок,
// текст) догоняют её с небольшим запозданием — это и даёт ощущение глубины.
const REVEAL_MS = 950; // длительность появления карточки
const STEP_MS = 620; // пауза между стартами соседних карточек
const LAYER_MS = 150; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)"; // мягкое торможение в самом конце

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
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect(); // одноразово: дальше наблюдать нечего
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // общий помощник: плавный выход слоя с собственной задержкой
  const layer = (base: number, step: number, hidden: string) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : hidden,
    transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
    transitionDelay: shown ? `${base + step}ms` : "0ms",
  });

  return (
    <section className="bg-[#F8F4F9] px-6 py-20">
      <div className="mx-auto max-w-[76rem]">
        <h2 className="text-center font-serif text-3xl font-semibold text-[#2D2433] md:text-5xl">
          Памятка по обращению с шарами
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-base font-medium text-[#5A4D66]">
          Несколько простых правил — и композиция проживёт максимально долго
        </p>

        {/* Три карточки в ряд, во втором ряду ещё три */}
        <div ref={gridRef} className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {careCards.map((card, idx) => {
            const base = idx * STEP_MS;
            const top = card.images.find((i) => i.bleed === "top");
            const bottom = card.images.find((i) => i.bleed === "bottom");
            const inline = card.images.filter((i) => !i.bleed);
            const box = inline.length > 1 ? PAIR : SOLO;

            return (
              <div
                key={card.title}
                className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-[#E8DEEE] bg-white p-7 text-center"
                style={{
                  opacity: shown ? 1 : 0,
                  transform: shown ? "none" : "translateY(38px) scale(0.955)",
                  filter: shown ? "blur(0px)" : "blur(7px)",
                  boxShadow: shown
                    ? "0 18px 40px -28px rgba(107,78,129,0.45)"
                    : "0 0 0 rgba(107,78,129,0)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}, filter ${REVEAL_MS}ms ${EASE}, box-shadow ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: shown ? `${base}ms` : "0ms",
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
                        ...layer(base, LAYER_MS, "translateY(-14px) scale(1.04)"),
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
                        ...layer(base, LAYER_MS, "translateY(16px) scale(0.93)"),
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
                      ...layer(base, LAYER_MS, "translateY(14px) scale(0.9)"),
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
                  style={layer(base, LAYER_MS * 2, "translateY(12px)")}
                >
                  {card.title}
                </h4>
                <p
                  className="relative z-10 mt-2 text-sm font-medium leading-relaxed text-[#5A4D66]"
                  style={layer(base, LAYER_MS * 3, "translateY(12px)")}
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
