import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Hero } from "./components/ui/Hero";
import { Reviews } from "./components/ui/Reviews";
import { CareCards } from "./components/ui/CareCards";
import { Faq } from "./components/ui/Faq";

// Импортируем картинки из assets
import comp3 from "./assets/composition-3.jpg";
import comp4 from "./assets/composition-4.jpg";
import comp5 from "./assets/composition-5.jpg";
import comp6 from "./assets/composition-6.jpg";
import comp7 from "./assets/composition-7.jpg";
import comp1_1 from "./assets/composition1.1.jpg";
import comp1_2 from "./assets/composition1.2.jpg";

/* ─────────────────────── НАШИ КОМПОЗИЦИИ ───────────────────────

   Один список на обе раскладки. Раньше снимки были рассыпаны прямо по
   разметке: три в видимой части, четыре под кнопкой «показать больше», и
   у каждого свой object-position в классе. Добавить восьмой значило
   вписать его в нужное место руками и не забыть про вторую раскладку.

   Раскладок две, и они разные по существу. На широком экране всё как
   было: мозаика из трёх снимков и кнопка «показать больше», по которой
   выезжают остальные четыре. На телефоне кнопки нет — там снимки
   листаются пальцем: раскрытие сетки в одну колонку добавляло экран
   высоты и заставляло страницу подпрыгивать, а листать привычнее.

   pos — куда смотреть при обрезке: у половины снимков главное не в
   середине кадра. */
const COMPOSITIONS = [
  { src: comp3, alt: "Композиция с цифрой", pos: "object-[50%_76%]" },
  { src: comp1_2, alt: "Детская фотосессия", pos: "" },
  { src: comp1_1, alt: "Праздник с шарами", pos: "object-[50%_26%]" },
  { src: comp4, alt: "Композиция из шаров пастельных тонов", pos: "object-top" },
  { src: comp5, alt: "Композиция с фольгированными шарами", pos: "" },
  { src: comp6, alt: "Оформление праздника шарами", pos: "object-[40%_6%]" },
  { src: comp7, alt: "Связка шаров с цифрой", pos: "object-[50%_40%]" },
];

export default function App() {
  /* Какой снимок сейчас по центру ленты — только для точек под ней.
     Считается из прокрутки самой ленты, а не наоборот: листание остаётся
     нативным, со всей его инерцией и прилипанием. */
  const strip = useRef<HTMLDivElement | null>(null);
  const [shot, setShot] = useState(0);

  /* Раскрытие мозаики на широком экране. На телефоне этой кнопки нет —
     там всё листается пальцем, — поэтому и состояние работает только там,
     где кнопка вообще отрисована. */
  const [showMore, setShowMore] = useState(false);
  const section = useRef<HTMLElement | null>(null);

  const toggleShowMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();

    if (!showMore) {
      setShowMore(true);
      return;
    }

    /* Схлопываем НЕ СРАЗУ. Сначала возвращаем экран к началу блока и
       только потом убираем нижний ряд: иначе страница укорачивается
       под уже едущей прокруткой и та промахивается мимо цели. */
    const el = section.current;
    if (!el) {
      setShowMore(false);
      return;
    }
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 80,
      behavior: "smooth",
    });
    setTimeout(() => setShowMore(false), 400);
  };

  const onStripScroll = () => {
    const el = strip.current;
    if (!el) return;
    const step = el.scrollWidth / COMPOSITIONS.length;
    const i = Math.round(el.scrollLeft / step);
    setShot(Math.min(COMPOSITIONS.length - 1, Math.max(0, i)));
  };

  const goToShot = (i: number) => {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({
      left: (el.scrollWidth / COMPOSITIONS.length) * i,
      behavior: "smooth",
    });
  };

  return (
    <div className="bg-[#FDFBFD] text-[#2D2433]">
      <Hero />

      {/* Наши композиции */}
      <section
        ref={section}
        id="compositions"
        className="bg-[#FFFAFD] px-6 py-16 md:py-20"
      >
        <div className="mx-auto max-w-[76rem]">
          <p className="text-center text-[13px] font-medium tracking-widest text-[#6B4E81] uppercase">
            Больше 5 лет с вами
          </p>
          <h2 className="mt-2 text-center font-serif text-[1.9rem] font-semibold text-[#2D2433] md:text-5xl">
            Наши Композиции
          </h2>

          {/* ── ТЕЛЕФОН: лента с прокруткой вбок ──
              -mx-6 + px-6 выводят ленту под самые края экрана, оставляя
              первый снимок на сетке страницы. Ширина слайда 78%, поэтому
              справа всегда торчит край следующего — это и есть подсказка,
              что ленту можно листать, без единой надписи об этом. */}
          <div className="md:hidden">
            <div
              ref={strip}
              onScroll={onStripScroll}
              className="scrollbar-hide -mx-6 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6"
            >
              {COMPOSITIONS.map((c, i) => (
                <div
                  key={c.alt}
                  className="aspect-[3/4] w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl bg-[#F0E8F4]"
                >
                  <img
                    src={c.src}
                    alt={c.alt}
                    /* Первый снимок виден сразу — его тянем обычным
                       порядком, остальные по мере листания. */
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className={`h-full w-full object-cover ${c.pos}`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-center gap-2">
              {COMPOSITIONS.map((c, i) => (
                <button
                  key={c.alt}
                  type="button"
                  onClick={() => goToShot(i)}
                  aria-label={`Снимок ${i + 1} из ${COMPOSITIONS.length}`}
                  aria-current={i === shot}
                  /* Точка мелкая, а поле нажатия вокруг неё — 24px:
                     попасть пальцем в четыре пикселя невозможно. */
                  className="cursor-pointer p-2.5"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      i === shot ? "w-5 bg-[#6B4E81]" : "w-1.5 bg-[#D9C6E4]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* ── ШИРОКИЙ ЭКРАН: прежняя мозаика с раскрытием по кнопке ──

              Кнопка осталась только здесь. На телефоне от неё отказались:
              там лента листается пальцем, и раскрывать нечего — а вот на
              широком экране это и есть способ не занимать пол-страницы
              снимками, пока их не попросили. */}
          <div className="hidden md:block">
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="group h-96 overflow-hidden rounded-3xl shadow-sm md:col-span-2">
                <img
                  src={COMPOSITIONS[0].src}
                  alt={COMPOSITIONS[0].alt}
                  className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${COMPOSITIONS[0].pos}`}
                />
              </div>
              <div className="flex flex-col gap-6">
                {COMPOSITIONS.slice(1, 3).map((c) => (
                  <div
                    key={c.alt}
                    className="group h-44 overflow-hidden rounded-3xl shadow-sm"
                  >
                    <img
                      src={c.src}
                      alt={c.alt}
                      className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${c.pos}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Плавное раскрытие: сетка едет от 0fr к 1fr, без скачка высоты */}
            <div
              className={`grid transition-all duration-700 ease-out ${
                showMore
                  ? "mt-6 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="grid gap-6 md:grid-cols-2">
                  {COMPOSITIONS.slice(3).map((c) => (
                    <div
                      key={c.alt}
                      className="group aspect-square overflow-hidden rounded-3xl shadow-sm"
                    >
                      <img
                        src={c.src}
                        alt={c.alt}
                        loading="lazy"
                        className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${c.pos}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <button
                onClick={toggleShowMore}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E8DEEE] bg-white px-8 py-3 text-[13px] font-medium tracking-widest text-[#6B4E81] uppercase shadow-sm transition hover:border-[#6B4E81] hover:bg-[#F8F4F9]"
              >
                {showMore ? "Скрыть" : "Показать больше"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-500 ${
                    showMore ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Условия заказа */}
      <section id="order" className="relative overflow-hidden px-6 pt-14 pb-20">
        {/* Фон приближен (шире контейнера в 1.5 раза), а object-position
            подобран так, чтобы полоса с воздушными шарами легла в верхнюю
            часть секции — над карточками, которые её не перекрывают. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="/assets/back2.jpg"
            alt=""
            className="absolute top-0 left-1/2 h-full max-w-none -translate-x-1/2 object-cover"
            style={{
              width: "158%",
              objectPosition: "50% 85%",
              filter: "blur(2.5px) brightness(0.94) saturate(0.82)",
            }}
          />
          {/* вуаль под белый текст */}
          <div className="absolute inset-0 bg-[#2B1B36]/58" />
        </div>

        <div className="relative z-10 max-w-[76rem] mx-auto">
          <h2 className="text-center font-serif text-3xl font-semibold text-white md:text-5xl">
            Заказ и получение
          </h2>
          <p className="text-center text-base font-regular text-white mt-2">
            Гарантия качества и доставка по Ярославлю
          </p>

          <div className="mt-16 grid gap-8 md:grid-cols-3 text-center">
            <div className="group flex flex-col items-center bg-white p-8 rounded-3xl border border-[#E8DEEE] transition duration-300 ease-out hover:-translate-y-1.5 hover:border-[#6B4E81]/40 hover:shadow-[0_20px_45px_-25px_rgba(107,78,129,0.5)]">
              <div className="w-14 h-14 rounded-full border border-[#6B4E81] text-[#6B4E81] font-serif text-xl flex items-center justify-center font-medium transition duration-300 ease-out group-hover:bg-[#6B4E81] group-hover:text-white">
                01
              </div>
              <h3 className="mt-6 font-serif text-xl font-semibold">
                Как оформить заказ
              </h3>
              <p className="mt-3 text-[15px] font-medium text-[#5A4D66] leading-relaxed">
                Соберите корзину на сайте или пришлите нам свой референс.
                Быстро ответим, уточним детали и назовём точную стоимость.
                Цены на сайте предварительные: итог зависит от размера, состава и даты.
              </p>
            </div>
            <div className="group flex flex-col items-center bg-white p-8 rounded-3xl border border-[#E8DEEE] transition duration-300 ease-out hover:-translate-y-1.5 hover:border-[#6B4E81]/40 hover:shadow-[0_20px_45px_-25px_rgba(107,78,129,0.5)]">
              <div className="w-14 h-14 rounded-full border border-[#6B4E81] text-[#6B4E81] font-serif text-xl flex items-center justify-center font-medium transition duration-300 ease-out group-hover:bg-[#6B4E81] group-hover:text-white">
                02
              </div>
              <h3 className="mt-6 font-serif text-xl font-semibold">
                Доставка и сроки
              </h3>
              <p className="mt-3 text-[15px] font-medium text-[#5A4D66] leading-relaxed">
                Доставляем по Ярославлю и пригороду в защитном пакете к удобному для вас времени, которое мы заранее обсуждаем в переписке.
                Так же возможен самовывоз, адрес уточняйте при заказе.
              </p>
            </div>
            <div className="group flex flex-col items-center bg-white p-8 rounded-3xl border border-[#E8DEEE] transition duration-300 ease-out hover:-translate-y-1.5 hover:border-[#6B4E81]/40 hover:shadow-[0_20px_45px_-25px_rgba(107,78,129,0.5)]">
              <div className="w-14 h-14 rounded-full border border-[#6B4E81] text-[#6B4E81] font-serif text-xl flex items-center justify-center font-medium transition duration-300 ease-out group-hover:bg-[#6B4E81] group-hover:text-white">
                03
              </div>
              <h3 className="mt-6 font-serif text-xl font-semibold">
                Оплата и возврат
              </h3>
              <p className="mt-3 text-[15px] font-medium text-[#5A4D66] leading-relaxed">
                Предоплата 50%, остаток при получении. Если шар сдулся или пришёл повреждённым — заменим или
                вернём деньги: напишите нам в день получения.
              </p>
            </div>
          </div>

        </div>
      </section>

      <Reviews />

      <CareCards />

      <Faq />
    </div>
  );
}
