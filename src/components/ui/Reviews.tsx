import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Expand,
  Quote,
  Star,
} from "lucide-react";

import { reviews } from "../../constants";
import { Lightbox } from "./Lightbox";

export const Reviews = () => {
  const [current, setCurrent] = useState(0);
  const [photo, setPhoto] = useState(0);
  /** Открытый во весь экран кадр; null — просмотрщик закрыт. */
  const [zoom, setZoom] = useState<number | null>(null);

  const review = reviews[current];
  const total = review.photos.length;

  /* Просмотрщику нужны кадры в его формате. Размеров у нас нет — тогда он
     просто не станет растягивать снимок выше его настоящего размера. */
  const shots = review.photos.map((src) => ({ src }));

  const go = (dir: 1 | -1) => {
    setCurrent((p) => (p + dir + reviews.length) % reviews.length);
    setPhoto(0); // у нового отзыва свои фотографии — начинаем с первой
  };

  const arrow =
    "flex h-12 w-12 items-center justify-center rounded-full border border-[#6B4E81] text-[#6B4E81] transition hover:bg-[#6B4E81] hover:text-white cursor-pointer";

  // 79rem = 76rem + 2×24px (px-6) — край контента совпадает с остальными
  // секциями и шапкой (у них padding вне max-w-контейнера)
  return (
    <section id="reviews" className="mx-auto max-w-[79rem] px-6 py-20">
      <style>{`
        .review-scroll { scrollbar-width: thin; scrollbar-color: #C9B4D6 transparent; }
        .review-scroll::-webkit-scrollbar { width: 6px; }
        .review-scroll::-webkit-scrollbar-thumb { background: #C9B4D6; border-radius: 999px; }
        .review-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Шапка блока */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E8DEEE] bg-white px-4 py-1.5 text-[13px] font-semibold tracking-widest text-[#6B4E81] uppercase">
            <span className="h-px w-4 bg-[#6B4E81]" />
            Отзывы
          </span>
          <h2 className="mt-4 font-serif text-3xl font-semibold text-[#2D2433] md:text-5xl">
            Впечатления наших клиентов
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => go(-1)}
            aria-label="Предыдущий отзыв"
            className={arrow}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Следующий отзыв"
            className={arrow}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Карточка. Высота фиксированная, поэтому длина отзыва не меняет вёрстку. */}
      <div className="mt-10 grid h-[620px] grid-rows-[210px_minmax(0,1fr)] gap-5 overflow-hidden rounded-3xl border border-[#E8DEEE] bg-[#F8F4F9] p-5 md:h-[460px] md:grid-cols-2 md:grid-rows-[minmax(0,1fr)] md:gap-8 md:p-8">
        {/* Текст */}
        <div className="flex min-h-0 flex-col">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-[#E9A23B] text-[#E9A23B]" />
            ))}
          </div>

          <Quote className="mt-4 h-7 w-7 shrink-0 fill-[#D9C6E4] text-[#D9C6E4]" />

          {/* Длинный отзыв не растягивает блок — появляется прокрутка */}
          <div
            data-lenis-prevent
            className="review-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-3"
          >
            <p className="text-[15px] font-medium leading-relaxed whitespace-pre-line text-[#5A4D66] md:text-base">
              {review.text}
            </p>
          </div>

          <div className="mt-5 shrink-0 border-t border-[#E8DEEE] pt-4">
            <h4 className="font-serif text-base font-semibold text-[#2D2433]">
              {review.author}
            </h4>
            <p className="mt-0.5 text-sm font-medium text-[#7E6E8A]">
              {review.role}
            </p>
          </div>
        </div>

        {/* Фотографии отзыва */}
        <div className="group relative order-first min-h-0 overflow-hidden rounded-2xl bg-[#EFE6F2] md:order-none">
          {review.photos.map((src, i) => (
            <img
              decoding="async"
              key={src}
              src={src}
              alt={`Фото к отзыву — ${review.author}`}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                i === photo ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* КЛИК ПО СНИМКУ ОТКРЫВАЕТ ЕГО ЦЕЛИКОМ.

              Отдельная кнопка во всю площадь, а не обработчик на самом
              блоке: так работает и клавиатура, и не приходится глушить
              всплытие у стрелок с точками — они лежат выше по z-индексу и
              забирают свои нажатия сами.

              В карточке снимок обрезан по object-cover, то есть виден не
              весь; просмотрщик показывает кадр по object-contain и целиком.
              Он же общий с лентой и услугами — листание стрелками, свайпом
              и полоской превью достаётся бесплатно. */}
          <button
            type="button"
            onClick={() => setZoom(photo)}
            aria-label="Открыть фотографию во весь экран"
            className="absolute inset-0 cursor-zoom-in"
          />

          {/* Подсказка только там, где есть курсор: на телефоне значок
              поверх фотографии — просто мусор, тап и так работает. */}
          <span className="pointer-events-none absolute top-3 right-3 z-10 hidden h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#6B4E81] opacity-0 shadow-sm backdrop-blur-sm transition group-hover:opacity-100 md:flex">
            <Expand className="h-4 w-4" />
          </span>

          {total > 1 && (
            <>
              <button
                onClick={() => setPhoto((p) => (p - 1 + total) % total)}
                aria-label="Предыдущее фото"
                className="absolute top-1/2 left-3 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-[#6B4E81] opacity-100 shadow-md transition md:opacity-0 md:group-hover:opacity-100 hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPhoto((p) => (p + 1) % total)}
                aria-label="Следующее фото"
                className="absolute top-1/2 right-3 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-[#6B4E81] opacity-100 shadow-md transition md:opacity-0 md:group-hover:opacity-100 hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                {review.photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhoto(i)}
                    aria-label={`Фото ${i + 1}`}
                    className={`h-1.5 cursor-pointer rounded-full transition-all ${
                      i === photo
                        ? "w-6 bg-[#6B4E81]"
                        : "w-1.5 bg-white/80 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Позиция в списке */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {reviews.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrent(i);
              setPhoto(0);
            }}
            aria-label={`Отзыв ${i + 1}`}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${
              i === current
                ? "w-6 bg-[#6B4E81]"
                : "w-1.5 bg-[#D9C6E4] hover:bg-[#B99BCB]"
            }`}
          />
        ))}
      </div>

      <Lightbox
        shots={shots}
        index={zoom}
        title={`Фото к отзыву — ${review.author}`}
        onClose={() => setZoom(null)}
        /* Листание в просмотрщике двигает и карточку: закрыв его, видишь
           тот кадр, на котором остановился, а не тот, с которого начал. */
        onIndex={(i) => {
          setZoom(i);
          setPhoto(i);
        }}
      />
    </section>
  );
};
