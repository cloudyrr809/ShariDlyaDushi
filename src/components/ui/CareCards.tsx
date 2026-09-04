import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { careCards } from "../../constants";

/* ПАМЯТКА ПО ОБРАЩЕНИЮ С ШАРАМИ — пять правил в bento-сетке 4×2.

     ┌───────────────┬───────┬───────┐
     │               │ питом.│ ВАЖНО │
     │  за ленту     ├───────┼───────┤
     │               │  ЭКО  │ салон │
     └───────────────┴───────┴───────┘

   Плашки разведены по диагонали (порядок карточек — в constants.ts):
   в одном столбце они перевешивали.

   ЧЕТЫРЕ КОЛОНКИ ТОЛЬКО С 1200px, а не с md. Самый длинный заголовок —
   217px при 17px полужирном Montserrat, значит карточке нужно 267px, а
   четырём с зазорами — 1176px окна. Ниже работает телефонная раскладка. */

// Карточки выходят РЯДАМИ: сначала верхний ряд целиком, потом следующий.
const REVEAL_MS = 720; // длительность появления карточки
const ROW_MS = 280; // пауза между рядами
const LAYER_MS = 90; // сдвиг между слоями внутри карточки
const EASE = "cubic-bezier(0.33, 0, 0.2, 1)";

/* Габариты, в которые вписывается ВИДИМОЕ содержимое картинки — не кадр
   файла: прозрачные поля вокруг рисунка занимают от 20% до 74%, и по
   файлу один значок вышел бы вдвое крупнее соседнего.

   Габарит один на все квадратные карточки; поправка на оптическую массу
   у каждой картинки своя (поле k в constants.ts).

   У пары ширина 32, а не 33: 33 + 33 + зазор 12 давало 78px в коробке 72. */
const SOLO = { h: 72, w: 72 };
const PAIR = { h: 62, w: 32 };

type Img = {
  src: string;
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  ar: number;
  k?: number;
};

type Card = (typeof careCards)[number];

/** Насыщенней и с белой обводкой-стикером — для бледной картинки на
    цветной подложке. Снежинка из «перепадов» рисована почти белым
    (средний цвет rgb(226,236,251)) и без этого тонула в розовом фоне:
    другой человек её не замечал вовсе. Обводка — два наложенных
    drop-shadow по альфа-каналу вместо одного: тонкий белый контур сразу
    у края даёт чистую обводку, широкий и мягкий — лёгкое свечение вокруг
    неё, чтобы граница со сложным фоном (тут ещё и балкон солнца) не
    терялась ни на одном участке. */
const VIVID_FILTER =
  "saturate(1.6) brightness(1.1) " +
  "drop-shadow(0 0 1px rgba(255,255,255,0.95)) " +
  "drop-shadow(0 0 3px rgba(255,255,255,0.75)) " +
  "drop-shadow(0 1px 2px rgba(107,78,129,0.3))";

/** Картинка, обрезанная по содержимому: прозрачные поля уходят за край
    обёртки, а сама обёртка и есть видимый шар. */
const Cropped = ({
  img,
  opacity,
  vivid,
}: {
  img: Img;
  opacity?: number;
  vivid?: boolean;
}) => (
  <img
    decoding="async"
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
      opacity,
      filter: vivid ? VIVID_FILTER : undefined,
    }}
  />
);

/** СЦЕНА: несколько картинок слоями по коробке значка — там, где значок
    не один предмет, а композиция. Порядок в массиве = порядок слоёв,
    координаты в процентах от коробки, высота из пропорций содержимого.
    z-10 у каждого слоя (а не просто DOM-порядок) — иначе filter с
    drop-shadow у vivid-слоя создал бы свой стекинг-контекст и мог
    неожиданно перекрыть слой, который должен быть выше по смыслу.

    memo-scene приглушает наведение (index.css): общая тень в 18px
    размывала предметы величиной с ноготь в одно пятно. */
const Scene = ({
  scene,
}: {
  scene: readonly {
    img: Img;
    left: number;
    top: number;
    w: number;
    opacity?: number;
    vivid?: boolean;
  }[];
}) => (
  /* self-stretch: коробка выстроена по нижнему краю, а элементы сцены
     лежат абсолютом и своей высоты не дают — без него схлопнется в ноль. */
  <div className="memo-scene relative w-full self-stretch">
    {scene.map(({ img, left, top, w, opacity, vivid }, i) => (
      <div
        key={`${img.src}-${i}`}
        className="memo-figure absolute"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${w}%`,
          aspectRatio: `${img.ar}`,
          zIndex: i,
        }}
      >
        <Cropped img={img} opacity={opacity} vivid={vivid} />
      </div>
    ))}
  </div>
);

/** Ряд картинок карточки, вписанных в отведённый габарит.

    items-end justify-start: у картинок разные пропорции, и по центру их
    нижние края расходились до 14px. Общая линия важнее центровки. */
const Art = ({ card, box }: { card: Card; box: typeof SOLO }) => (
  <div className="flex items-end justify-start gap-2">
    {card.images.map((img, i) => {
      // Вписываем по той стороне, которая упирается первой
      const byWidth = img.ar > box.w / box.h;
      const k = img.k ?? 1; // поправка на оптическую массу
      const w = (byWidth ? box.w : box.h * img.ar) * k;
      const h = (byWidth ? box.w / img.ar : box.h) * k;

      return (
        <div
          key={img.src}
          /* без overflow-hidden: поворот ±7° и подъём на наведении
             срезало бы по краям. memo-figure — левитация, index.css. */
          className="memo-figure relative"
          style={{
            width: w,
            height: h,
            transform:
              card.images.length > 1
                ? `rotate(${i === 0 ? -7 : 7}deg)`
                : undefined,
          }}
        >
          <Cropped img={img} />
        </div>
      );
    })}
  </div>
);

/* Размытия подложки (backdrop-filter) здесь нет намеренно: замер даёт
   92 → 75 мс худшего кадра при первой прокрутке, а размывать под
   карточками нечего — там три мягких пятна. */
/* Тень короткая (6px), форму держит контур: длинная тень на светлом фоне
   только мылит края. Цвет контура задаётся вместе с подложкой (tone). */
const CARD =
  "memo-card flex h-full flex-col rounded-3xl border " +
  "shadow-[0_2px_6px_rgba(45,36,51,0.05)] " +
  "transition duration-500 ease-out " +
  "md:hover:-translate-y-1.5 " +
  "md:hover:shadow-[0_10px_20px_rgba(45,36,51,0.10)]";

export const CareCards = () => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* ПОЯВЛЕНИЕ ПО РЯДАМ: задержка назначается не карточке, а её ряду.
     Ряд определяем по фактическому offsetTop, а не по номеру карточки —
     в bento-сетке ряды разной длины. */
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
    /* Верхний падинг 84px = 73 прилипшей шапки + 11 воздуха: иначе
       надстрочка «бережно» целиком уезжает под шапку, стоит секции дойти
       до верха экрана. */
    <section className="relative flex flex-col justify-center overflow-hidden bg-[#F8F4F9] px-6 pt-[5.25rem] pb-12 md:min-h-[85vh] md:pb-10">
      {/* Цветные пятна: без них полупрозрачные карточки поверх ровной
          заливки — это просто белый прямоугольник. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-[460px] w-[460px] rounded-full bg-[#D9A7C0]/28 blur-[110px]" />
        <div className="absolute top-1/4 -right-24 h-[520px] w-[520px] rounded-full bg-[#6B4E81]/18 blur-[130px]" />
        <div className="absolute -bottom-28 left-1/4 h-[440px] w-[440px] rounded-full bg-[#C9A6E0]/24 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[76rem]">
        <p className="font-miana pb-[0.5em] text-center text-2xl leading-none text-[#C46B8A] md:text-3xl">
          бережно
        </p>

        <h2 className="text-center text-[2rem] leading-[1.1] font-semibold tracking-[-0.015em] text-[#2D2433] md:text-[2.6rem]">
          Памятка по обращению с шарами
        </h2>

        {/* 34ch + text-balance: при 576px последнее слово оставалось одно
            на второй строке. */}
        <p className="mx-auto mt-2.5 max-w-[34ch] text-center text-base leading-relaxed font-medium text-balance text-[#5A4D66] md:text-[17px]">
          Несколько простых правил и шарики будут летать очень долго!
        </p>

        {/* До 1200px — две колонки, ширина поджата до 46rem: иначе на
            планшете карточки расплываются в полосы. С 1200px — четыре, и
            grid-auto-rows: 1fr держит оба ряда одной высоты, иначе большая
            карточка тянулась бы на два разных ряда. */}
        <div className="mx-auto mt-8 grid max-w-[46rem] grid-cols-2 gap-4 md:gap-5 min-[1200px]:max-w-none min-[1200px]:grid-cols-4 min-[1200px]:[grid-auto-rows:1fr]">
          {careCards.map((card, idx) => {
            const hero = "hero" in card && card.hero;
            const accent = "accent" in card && card.accent;
            const tag = "tag" in card ? card.tag : undefined;

            /* ДВА ТОНА: тон отвечает ровно на один вопрос — есть плашка
               или нет. Лиловый убран: подложка секции сама лилово-сиреневая,
               и разница по каналам выходила (1, −5, 6) против (16, 11, 7)
               у розового. */
            const tone = tag
              ? "border-[#EFD4E0] bg-[#FBEFF5] md:hover:border-[#D9A7C0] md:hover:bg-[#FDF5F9]"
              : "border-[#E8DEEE] bg-white/80 md:hover:border-[#D9C6E4] md:hover:bg-white/95";

            return (
              /* Внешняя обёртка — появление и место в сетке, внутренняя —
                 наведение: появление пишет transform инлайном, а он сильнее
                 классов, и подъём на той же ноде не сработал бы. */
              <div
                key={card.title}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                data-card={idx}
                className={hero ? "col-span-2 min-[1200px]:row-span-2" : ""}
                style={{
                  opacity: isShown(idx) ? 1 : 0,
                  transform: isShown(idx)
                    ? "none"
                    : "translateY(20px) scale(0.98)",
                  transition: `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}`,
                  transitionDelay: isShown(idx) ? `${delays[idx]}ms` : "0ms",
                }}
              >
                {hero ? (
                  /* ── БОЛЬШАЯ КАРТОЧКА ──
                     Связка свисает с верхней кромки, внизу заголовок и
                     текст — тот же порядок чтения, что у квадратных.
                     overflow-hidden обязателен: картинка обрезана по
                     верхнему краю кадра и на наведении подаётся выше. */
                  <article
                    className={`${CARD} ${tone} overflow-hidden p-6 pt-0 md:p-8 md:pt-0`}
                  >
                    {/* Отрицательные поля гасят боковые падинги: связка
                        меряется от кромки до кромки. 68% ширины с потолком
                        420px — при 596 узел разъезжался в розовое пятно.
                        Обрезка сверху заложена в самом файле (fy = 0). */}
                    <div
                      className="-mx-6 flex justify-center md:-mx-8"
                      style={layer(
                        idx,
                        LAYER_MS,
                        "translateY(-10px) scale(0.96)",
                      )}
                    >
                      <div
                        className="memo-figure relative w-[68%] max-w-[420px] self-start"
                        style={{ aspectRatio: `${card.images[0].ar}` }}
                      >
                        <Cropped img={card.images[0]} />
                      </div>
                    </div>

                    {/* Излишек высоты забирает ТЕКСТОВЫЙ блок и делит его
                        поровну сверху и снизу: если излишек отдать блоку
                        иллюстрации, все 116px соберутся в одну белую полосу
                        между узлом и заголовком. */}
                    <div className="mt-6 flex flex-1 flex-col justify-center">
                      <h3
                        className="text-[1.35rem] leading-tight font-bold tracking-[-0.015em] text-[#2D2433] md:text-2xl"
                        style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                      >
                        {card.title}
                      </h3>

                      <p
                        className="mt-3 max-w-md text-[15px] leading-[1.55] font-medium text-[#4A3A5C] md:text-base"
                        style={layer(idx, LAYER_MS * 3, "translateY(8px)")}
                      >
                        {card.description}
                      </p>

                      {/* Ссылка текстом, без плашки: кнопка с заливкой
                          рядом с описанием правила читалась бы как
                          «согласен». Черта стоит сразу — она и есть признак
                          ссылки. */}
                      <Link
                        to="/catalog"
                        className="group/link mt-5 inline-flex w-fit items-center gap-2 border-b border-[#6B4E81]/40 pb-0.5 text-[15px] font-bold text-[#6B4E81] transition-colors hover:border-[#513A6B] hover:text-[#513A6B] md:text-base"
                        style={layer(idx, LAYER_MS * 4, "translateY(8px)")}
                      >
                        Посмотреть каталог
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover/link:translate-x-1" />
                      </Link>
                    </div>
                  </article>
                ) : (
                  /* ── КВАДРАТНАЯ КАРТОЧКА ──
                     gap-5, а не mt-auto: mt-auto отрывал текст от значка и
                     прижимал к нижней кромке — 37px дыры вместо 20.
                     relative — для плашки в правом верхнем углу. */
                  <article
                    className={`${CARD} ${tone} relative gap-5 p-5 md:p-6`}
                  >
                    {/* Плашка в углу — только с sm. При ширине карточки
                        163px значок занимает 20..92, а «ВАЖНО» начинается с
                        61-го пикселя: 72 + 82 + отступы в 163 не помещаются
                        никак, и на телефоне плашка идёт обычной строкой. */}
                    {tag && (
                      <span
                        className={`w-fit rounded-full border px-2.5 py-0.5 text-[13px] font-bold tracking-[0.08em] uppercase sm:absolute sm:top-4 sm:right-4 ${
                          accent
                            ? "border-[#D9C2EA] bg-white/70 text-[#513A6B]"
                            : "border-[#EFD4E0] bg-white/70 text-[#A64D6C]"
                        }`}
                      >
                        {tag}
                      </span>
                    )}

                    {/* Квадрат 72×72 под значок — один на все карточки. */}
                    <div
                      className="flex h-[72px] w-[72px] items-end justify-start"
                      style={layer(
                        idx,
                        LAYER_MS,
                        "translateY(8px) scale(0.92)",
                      )}
                    >
                      {"scene" in card && card.scene ? (
                        <Scene scene={card.scene} />
                      ) : (
                        <Art
                          card={card}
                          box={card.images.length > 1 ? PAIR : SOLO}
                        />
                      )}
                    </div>

                    <div>
                      <h3
                        className="text-[17px] leading-tight font-bold tracking-[-0.01em] text-[#2D2433]"
                        style={layer(idx, LAYER_MS * 2, "translateY(8px)")}
                      >
                        {card.title}
                      </h3>

                      <p
                        className="mt-1.5 text-[13px] leading-[1.45] font-medium text-[#4A3A5C]"
                        style={layer(idx, LAYER_MS * 3, "translateY(8px)")}
                      >
                        {card.description}
                      </p>
                    </div>
                  </article>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
