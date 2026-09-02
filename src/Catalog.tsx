import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { WorkHeader } from "./components/ui/PageHeader";
import { TabStrip } from "./components/ui/TabStrip";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useCart } from "./CartContext";
import { themeSubcategories } from "./constants";
import {
  ALL_ID,
  categoriesWithAll,
  fallbackProducts,
  fetchProducts,
  inCategory,
  type Product,
} from "./lib/catalog";

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useCart();
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const images = product.images || [];
  const imagesCount = images.length;
  const hasMultiple = imagesCount > 1;

  // АНИМАЦИЯ ПОЛЕТА В КОРЗИНУ
  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    addToCart(product);

    const card = e.currentTarget.closest(".group");
    const img = card?.querySelector("img");
    const cartIcon = document.getElementById("cart-icon-header");

    if (img && cartIcon) {
      const imgRect = img.getBoundingClientRect();
      const cartRect = cartIcon.getBoundingClientRect();

      const flyingImg = img.cloneNode(true) as HTMLImageElement;
      flyingImg.style.position = "fixed";
      flyingImg.style.top = `${imgRect.top}px`;
      flyingImg.style.left = `${imgRect.left}px`;
      flyingImg.style.width = `${imgRect.width}px`;
      flyingImg.style.height = `${imgRect.height}px`;
      flyingImg.style.borderRadius = "16px";
      flyingImg.style.zIndex = "9999";
      flyingImg.style.transition = "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
      flyingImg.style.pointerEvents = "none";
      document.body.appendChild(flyingImg);

      requestAnimationFrame(() => {
        flyingImg.style.top = `${cartRect.top + 10}px`;
        flyingImg.style.left = `${cartRect.left + 10}px`;
        flyingImg.style.width = "20px";
        flyingImg.style.height = "20px";
        flyingImg.style.opacity = "0";
        flyingImg.style.transform = "scale(0.1) rotate(15deg)";
      });

      setTimeout(() => {
        flyingImg.remove();
        cartIcon.classList.add("scale-125");
        setTimeout(() => cartIcon.classList.remove("scale-125"), 200);
      }, 400);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-3 md:p-4 border border-[#E8DEEE] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col relative">
      <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#F0E8F4] mb-4 relative flex items-center justify-center">
        {imagesCount > 0 ? (
          <img
            src={images[activeIndex]}
            alt={product.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imgErrors[activeIndex] ? "hidden" : "block"
            }`}
            onError={() =>
              setImgErrors((prev) => ({ ...prev, [activeIndex]: true }))
            }
          />
        ) : (
          <span className="text-[13px] text-[#A093AB]">Нет фото</span>
        )}

        {imgErrors[activeIndex] && imagesCount > 0 && (
          <span className="pointer-events-none absolute text-[13px] font-medium text-[#A093AB]">
            Фото {activeIndex + 1}
          </span>
        )}

        {/* Листание фотографий карточки.

            Мышью — наведением: курсор над левой третью показывает первый
            кадр, над правой последний. Пальцем навести нельзя, поэтому на
            телефоне те же зоны работают по касанию и перелистывают на
            следующий кадр по кругу. Без этого второе и третье фото
            композиции с телефона было не увидеть вообще.

            pointerType, а не отдельная вёрстка для мобильного: мышь и
            палец приходят в один и тот же обработчик, и различить их
            надёжнее, чем угадывать по ширине экрана — на ноутбуке с
            сенсорным экраном работают оба способа. */}
        {hasMultiple && (
          <div className="absolute inset-0 flex">
            {images.map((_, idx: number) => (
              <div
                key={idx}
                className="z-10 h-full flex-1"
                onMouseEnter={() => setActiveIndex(idx)}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse") return;
                  setActiveIndex((i) => (i + 1) % imagesCount);
                }}
              />
            ))}
          </div>
        )}

        {hasMultiple && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 pointer-events-none">
            {images.map((_, idx: number) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? "w-4 bg-white shadow-sm"
                    : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mb-2 px-1">
        <span className="font-serif font-bold text-lg md:text-xl text-[#2D2433]">
          {product.price} ₽
        </span>
        {product.oldPrice && (
          <span className="mb-1 text-[13px] text-[#A093AB] line-through md:text-sm">
            {product.oldPrice} ₽
          </span>
        )}
      </div>

      <h3 className="text-sm md:text-base font-medium text-[#5A4D66] leading-snug px-1 flex-grow mb-4">
        {product.title}
      </h3>

      <button
        onClick={handleAddToCart}
        className="w-full bg-[#F8F4F9] text-[#6B4E81] border border-[#E8DEEE] py-2.5 rounded-xl text-[13px] font-semibold hover:bg-[#6B4E81] hover:text-white hover:border-[#6B4E81] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <ShoppingCart className="w-3.5 h-3.5" />В корзину
      </button>
    </div>
  );
};

export default function Catalog() {
  const location = useLocation();
  // Открываем на «Все»: она первая и показывает сразу весь ассортимент
  const [activeTab, setActiveTab] = useState(ALL_ID);

  /* Товары из базы; пока таблица пуста — те, что зашиты в коде. Не пустой
     каталог на время загрузки: витрина без товаров читается как поломка. */
  const [products, setProducts] = useState<Product[]>(fallbackProducts);

  useEffect(() => {
    let alive = true;
    fetchProducts()
      .then((p) => {
        if (alive && p && p.length > 0) setProducts(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && categoriesWithAll.some((c) => c.id === hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    window.history.pushState(null, "", `/catalog#${id}`);
  };

  return (
    <div className="bg-[#FDFBFD] text-[#2D2433] scroll-smooth">
      {/* 
        Шапка (Header) отсюда удалена. 
        Она теперь рендерится глобально в файле main.tsx 
      */}

      {/* ШАПКА СТРАНИЦЫ — тип «рабочая», общий компонент со страницей
          «Услуги». Раньше та же разметка была написана здесь и там по
          отдельности, и заголовки начали расходиться в цвете и кегле. */}
      <WorkHeader
        crumbs={[{ label: "Главная", to: "/" }, { label: "Каталог" }]}
        title="Каталог"
        lead="Выберите идеальную композицию или соберите свой уникальный сет для любого повода."
        photo={{
          src: "/assets/catalog-hero-bg.jpg",
          alt: "Композиции из воздушных шаров",
          position: "object-[50%_25%]",
        }}
      />

      {/* ИНТЕРАКТИВНЫЕ ВКЛАДКИ (ТАБЫ) — общий компонент со страницей
          «Услуги». gap-4, а не gap-8 как там: тут девять категорий, и их
          суммарная ширина 1073px из 1216 доступных — на больший зазор
          строка не влезает и последняя категория уходит за край.

          mb-8, а не прежние mb-12/16: тот отступ ставился, когда под
          вкладками ещё шла линия border-b и он читался как поле под ней.
          Линию убрали — и 64px превратились в пустоту между категориями и
          товарами. У блока товаров верхнего отступа нет, так что эти 32px и
          есть весь зазор. */}
      <div id="catalog-content">
        <TabStrip
          tabs={categoriesWithAll}
          active={activeTab}
          onPick={handleTabClick}
          className="mb-8"
        />
      </div>

      {/* РЕНДЕР ТОВАРОВ ВЫБРАННОЙ ВКЛАДКИ */}
      <div className="max-w-[79rem] mx-auto px-6 pb-12 min-h-[40vh]">
        {activeTab === "theme" ? (
          <div className="space-y-16">
            {themeSubcategories.map((subCat) => {
              const subCatProducts = products.filter((p) =>
                inCategory(p, subCat.id),
              );
              return (
                <div key={subCat.id} id={subCat.id} className="scroll-mt-24">
                  <h3 className="font-serif text-xl md:text-2xl font-medium text-[#6B4E81] mb-6 border-l-4 border-[#6B4E81] pl-4">
                    {subCat.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {subCatProducts.length > 0 ? (
                      subCatProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))
                    ) : (
                      <p className="text-sm text-[#A093AB] italic">
                        Здесь скоро появятся новинки...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* «Все» — весь ассортимент разом, включая карточки, которым
             разделов не назначили: иначе они нигде бы не показались. */
          (() => {
            const shown = products.filter((p) => inCategory(p, activeTab));

            /* Пустой раздел объясняет себя словами. Раньше здесь оставалась
               голая сетка без единой карточки, и это читалось как поломка —
               особенно после того, как из кода убрали одиннадцать карточек
               с выдуманными ценами и несуществующими фотографиями. */
            if (shown.length === 0) {
              return (
                <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
                  В этом разделе пока пусто — скоро добавим. А пока
                  посмотрите вкладку «Все» или напишите нам: соберём
                  композицию под ваш повод.
                </p>
              );
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {shown.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* ПРИЗЫВ К ДЕЙСТВИЮ — «абсолютная чистота»: ни плашки, ни заливки,
          ни скруглений. Блок отделён от товаров одной тонкой линией.

          Линия идёт по всей ширине контента (max-w-[79rem]), а текст сужен
          до max-w-2xl: так черта читается как разделитель секции, а не как
          короткий штрих над абзацем, и строки при этом не растягиваются.

          Цвет линии — сайтовый #E8DEEE, а не нейтральный gray-200: этой же
          рамкой обведены все карточки товаров выше, и серая выбивалась бы
          из фиолетовой гаммы. */}
      <section className="px-6 pb-8">
        <div className="mx-auto w-full max-w-[79rem] border-t border-[#E8DEEE] py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-[-0.02em] text-[#513A6B] uppercase md:text-4xl">
              Не нашли идеальный вариант?
            </h2>

            <p className="mt-5 mb-8 text-lg leading-relaxed font-normal text-[#5A4D66]">
              Расскажите нам о своей идее, и мы соберем для вас персональную
              композицию из шаров под любой бюджет и повод.
            </p>

            {/* inline-flex + mx-auto: кнопка занимает ширину своего текста и
                стоит по центру, а не растягивается на всю колонку.

                Заливка сохранена намеренно — см. пояснение в ответе: белый
                текст и hover:bg работают только поверх фона. Пропорции
                поджаты (py-3 вместо py-4), чтобы убрать громоздкость.

                Стрелка чуть уезжает вправо при наведении — тот самый
                микро-жест, ради которого она и добавлена. */}
            <a
              href="https://vk.ru/sharydlyadushi"
              target="_blank"
              rel="noreferrer"
              className="group mx-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#6B4E91] px-8 py-3 font-medium text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#513A6B]"
            >
              Напишите нам
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      {/* 
        Футер (Footer) и Корзина (CartDrawer) отсюда удалены. 
        Они теперь рендерятся глобально в файле main.tsx 
      */}
    </div>
  );
}
