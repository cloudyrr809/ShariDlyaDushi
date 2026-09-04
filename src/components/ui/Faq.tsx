import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { faq } from "../../constants";

// Раскрытие через grid-rows 0fr → 1fr: высота едет плавно и без замеров в JS.
const OPEN_MS = 620;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export const Faq = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative overflow-hidden px-6 py-20">
      {/* Тот же снимок, что и на первом экране, только приглушённый */}
      <div className="pointer-events-none absolute inset-0">
        <img
          decoding="async"
          src="/assets/back2-faq.webp"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#2B1B36]/58" />
      </div>

      {/* max-w-[76rem] — та же ширина, что у сетки карточек памятки выше,
          чтобы левый и правый край блоков совпадали */}
      <div className="relative z-10 mx-auto max-w-[76rem]">
        <h2 className="text-center font-serif text-3xl font-semibold text-white md:text-5xl lg:text-6xl">
          Часто задаваемые вопросы
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-base font-medium text-white/95">
          Не нашли ответ на свой вопрос — просто напишите нам
        </p>

        <div className="mt-10 space-y-3">
          {faq.map((item, i) => {
            const isOpen = open === i;

            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-white/20"
                style={{
                  transition: `background-color ${OPEN_MS}ms ${EASE}, border-color ${OPEN_MS}ms ${EASE}`,
                  // Тёмная, а не белая: под белым текстом белёсая подложка
                  // осветляла фон и роняла контраст ответа до 3.5 при норме
                  // 4.5. Тёмная даёт тексту опору, а сама секция остаётся
                  // такой же светлой.
                  backgroundColor: isOpen
                    ? "rgba(43,27,54,0.42)"
                    : "rgba(43,27,54,0.26)",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-5 px-6 py-5 text-left md:px-9 md:py-7"
                >
                  <span className="font-serif text-lg font-medium text-white md:text-2xl">
                    {item.q}
                  </span>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 text-white md:h-11 md:w-11"
                    style={{
                      transition: `transform ${OPEN_MS}ms ${EASE}, background-color ${OPEN_MS}ms ${EASE}`,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      backgroundColor: isOpen
                        ? "rgba(255,255,255,0.2)"
                        : "transparent",
                    }}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </button>

                <div
                  className="grid"
                  style={{
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    opacity: isOpen ? 1 : 0,
                    transition: `grid-template-rows ${OPEN_MS}ms ${EASE}, opacity ${OPEN_MS}ms ${EASE}`,
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-4xl px-6 pb-5 text-base font-medium leading-relaxed text-white/95 md:px-9 md:pb-7 md:text-lg">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
