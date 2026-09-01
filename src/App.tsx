import { useState, useRef } from "react";
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

export default function App() {
  const [showMoreCompositions, setShowMoreCompositions] = useState(false);

  // Реф для плавного скролла к секции композиций
  const compositionsRef = useRef<HTMLElement | null>(null);

  // Мягкое переключение без рывков
  const toggleShowMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur(); // Убираем фокус с кнопки

    if (showMoreCompositions) {
      if (compositionsRef.current) {
        const headerOffset = 80; // Учитываем высоту липкой шапки
        const topPos =
          compositionsRef.current.getBoundingClientRect().top +
          window.scrollY -
          headerOffset;

        // 1. Сначала запускаем плавный скролл наверх
        window.scrollTo({
          top: topPos,
          behavior: "smooth",
        });

        // 2. Даем браузеру 400 миллисекунд, чтобы доехать наверх,
        // и ТОЛЬКО ПОТОМ начинаем плавно схлопывать сетку.
        // Так высота страницы не будет конфликтовать со скроллом!
        setTimeout(() => {
          setShowMoreCompositions(false);
        }, 400);
      } else {
        setShowMoreCompositions(false);
      }
    } else {
      setShowMoreCompositions(true);
    }
  };

  return (
    <div className="bg-[#FDFBFD] text-[#2D2433]">
      <Hero />

      {/* Наши композиции */}
      <section
        ref={compositionsRef}
        id="compositions"
        className="bg-[#FFFAFD] px-6 py-20"
      >
        <div className="mx-auto max-w-[76rem]">
          <p className="text-center text-[13px] font-medium uppercase tracking-widest text-[#6B4E81]">
            Больше 5 лет с вами
          </p>
          <h2 className="mt-2 text-center font-serif text-3xl font-semibold text-[#2D2433] md:text-5xl">
            Наши Композиции
          </h2>

          {/* Основная сетка */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 h-96 rounded-3xl overflow-hidden shadow-sm group relative">
              <img
                src={comp3}
                alt="Композиция с цифрой"
                className="w-full h-full object-cover object-[50%_76%] group-hover:scale-105 transition duration-500"
              />
            </div>
            <div className="flex flex-col gap-6">
              <div className="h-44 rounded-3xl overflow-hidden shadow-sm group relative">
                <img
                  src={comp1_2}
                  alt="Детская фотосессия"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="h-44 rounded-3xl overflow-hidden shadow-sm group relative">
                <img
                  src={comp1_1}
                  alt="Праздник с шарами"
                  className="w-full h-full object-cover object-[50%_26%] group-hover:scale-105 transition duration-500"
                />
              </div>
            </div>
          </div>

          {/* Плавный контейнер с ультра-мягкой анимацией duration-700 */}
          <div
            className={`grid transition-all duration-700 ease-out ${
              showMoreCompositions
                ? "grid-rows-[1fr] opacity-100 mt-6"
                : "grid-rows-[0fr] opacity-0 mt-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group relative">
                  <img
                    src={comp4}
                    alt="Композиция 4"
                    className="w-full h-full object-cover object-[center_top] group-hover:scale-105 transition duration-500"
                  />
                </div>

                <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group relative">
                  <img
                    src={comp5}
                    alt="Композиция 5"
                    className="w-full h-full object-cover object-[center_center] group-hover:scale-105 transition duration-500"
                  />
                </div>

                <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group relative">
                  <img
                    src={comp6}
                    alt="Композиция 6"
                    className="w-full h-full object-cover object-[40%_6%] group-hover:scale-105 transition duration-500"
                  />
                </div>

                <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group relative">
                  <img
                    src={comp7}
                    alt="Композиция 7"
                    className="w-full h-full object-cover object-[50%_40%] group-hover:scale-105 transition duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Кнопка "ПОКАЗАТЬ БОЛЬШЕ / СКРЫТЬ" */}
          <div className="mt-12 text-center">
            <button
              onClick={toggleShowMore}
              className="inline-flex items-center gap-2 rounded-full border border-[#E8DEEE] bg-white px-8 py-3 text-xs font-medium uppercase tracking-widest text-[#6B4E81] hover:bg-[#F8F4F9] hover:border-[#6B4E81] transition shadow-sm cursor-pointer"
            >
              {showMoreCompositions ? "Скрыть" : "Показать больше"}
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-500 ${
                  showMoreCompositions ? "rotate-180" : ""
                }`}
              />
            </button>
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
            Заказывайте онлайн
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
                Соберите корзину на сайте или пришлите свой референс — заказ
                уйдёт нам во ВКонтакте. Ответим, уточним детали и назовём
                точную стоимость. Цены на сайте предварительные: итог зависит
                от размера, состава и даты.
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
                Доставляем по Ярославлю в защитном пакете ко времени, о котором
                договоримся. Композицию собираем под заказ, поэтому лучше
                написать заранее — срок и стоимость доставки подтвердим в
                переписке.
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
                Предоплата 50%, остаток при получении. Онлайн-оплаты на сайте
                нет. Если шар сдулся или пришёл повреждённым — заменим или
                вернём деньги: напишите нам в день получения.
              </p>
            </div>
          </div>

          {/* КТО ПРОДАВЕЦ.

              Закон о защите прав потребителей требует, чтобы покупатель мог
              узнать, с кем имеет дело, до заказа. Блок намеренно стоит
              здесь, рядом с условиями, а не только в подвале.

              ⚠️ ЗАПОЛНИТЬ ПЕРЕД ЗАПУСКОМ: вместо «Нина …» поставить полное
              имя, а после определения статуса (самозанятая или ИП) добавить
              строку с ИНН. Без ИНН блок остаётся честным, но неполным. */}
          <div className="mt-12 rounded-3xl border border-white/25 bg-white/10 p-6 text-center backdrop-blur-sm md:p-8">
            <p className="text-[15px] leading-relaxed font-medium text-white/90 md:text-base">
              Композиции собирает студия «Шары Для Души», Ярославль.
              Связаться:{" "}
              <a
                href="https://vk.com/sharydlyadushi"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white underline underline-offset-4 hover:opacity-80"
              >
                ВКонтакте
              </a>
              ,{" "}
              <a
                href="tel:+79806616888"
                className="font-semibold text-white underline underline-offset-4 hover:opacity-80"
              >
                8 (980) 661-6888
              </a>
              ,{" "}
              <a
                href="mailto:info@sharidlyadushi.com"
                className="font-semibold text-white underline underline-offset-4 hover:opacity-80"
              >
                info@sharidlyadushi.com
              </a>
              .
            </p>
            <p className="mt-3 text-[15px] leading-relaxed font-medium text-white/75">
              Сведения на сайте носят справочный характер и не являются
              публичной офертой. Состав, стоимость и сроки согласуются в
              переписке до оплаты.
            </p>
          </div>
        </div>
      </section>

      <Reviews />

      <CareCards />

      <Faq />
    </div>
  );
}
