import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { WorkHeader } from "./components/ui/PageHeader";
import {
  ShoppingCart,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Wallet,
  Sparkles,
} from "lucide-react";
import { useCart } from "./CartContext";

// Картинки лежат в src/assets и подключаются импортом, а не строкой
// "/assets/...": по такому пути их нет (public/assets их не содержит),
// из-за чего карусель во всех услугах показывала заглушку "Фото N".
import comp1 from "./assets/composition-1.jpg";
import comp2 from "./assets/composition-2.jpg";
import comp3 from "./assets/composition-3.jpg";
import comp4 from "./assets/composition-4.jpg";
import comp5 from "./assets/composition-5.jpg";
import comp6 from "./assets/composition-6.jpg";
import comp7 from "./assets/composition-7.jpg";

// --- ТИП УСЛУГИ ---
type Service = {
  id: string;
  key: string;
  title: string;
  time: string;
  price: number;
  format: string;
  shortDesc: string;
  paragraphs: string[];
  includes: string[];
  images: string[];
};

// --- ДАННЫЕ УСЛУГ ---
// ВРЕМЕННЫЕ ФОТО: composition-1..7.jpg из /assets. Меняй просто в массиве images.
const servicesData: Service[] = [
  {
    id: "srv_1",
    key: "photosessions",
    title: "ФОТОСЕССИИ",
    time: "от 2 часов",
    price: 5000,
    format: "студия / улица / дом",
    shortDesc: "— профессиональная съемка ваших праздников",
    paragraphs: [
      "Организация и проведение фотосессии с нашим авторским декором из воздушных шаров. Мы берём на себя всё: от идеи и подбора локации до финальной цветокоррекции каждого кадра.",
      "Перед съёмкой мы обсуждаем референсы, палитру и настроение будущих фотографий. Это позволяет собрать фотозону, которая идеально ляжет в ваш образ и не будет спорить с интерьером или пейзажем.",
      "На самой съёмке фотограф помогает с позированием — вам не нужно уметь позировать, достаточно просто прийти. Мы работаем и со взрослыми, и с детьми, умеем ловить живые эмоции, а не «застывшие» постановочные кадры.",
      "В течение 7–10 дней вы получаете галерею из 50 обработанных фотографий в авторской цветокоррекции, плюс все технически удачные исходники без ретуши.",
    ],
    includes: [
      "Разработка концепции и подбор референсов",
      "Декор из воздушных шаров и реквизит",
      "Работа фотографа и помощь в позировании",
      "50 обработанных кадров + все исходники",
    ],
    images: [
      comp1,
      comp2,
      comp3,
      comp4,
    ],
  },
  {
    id: "srv_2",
    key: "schoolShoots",
    title: "СЪЕМКИ В ШКОЛАХ",
    time: "от 3 часов",
    price: 8000,
    format: "школы и детские сады",
    shortDesc: "— яркие моменты для выпускников и первоклашек",
    paragraphs: [
      "Комплексная съёмка в детских садах и школах: портреты, групповые кадры, репортаж с занятий и праздника. Работаем аккуратно и по расписанию, чтобы не ломать учебный процесс.",
      "Привозим с собой мобильную фотозону с шарами и светом — она разворачивается за 20 минут прямо в актовом зале или рекреации. Дети воспринимают это как игру, поэтому кадры получаются живыми, а не «дежурными».",
      "Отдельно снимаем портреты для выпускного альбома: единый фон, единый свет, одинаковая обработка — страницы выглядят цельно и профессионально.",
      "Согласовываем список детей с родительским комитетом заранее, чтобы никто не потерялся, и присылаем защищённую галерею для отбора кадров.",
    ],
    includes: [
      "Мобильная фотозона и выездной свет",
      "Портретная и репортажная съёмка",
      "Единая обработка всех портретов",
      "Закрытая галерея для родителей",
    ],
    images: [
      comp5,
      comp6,
      comp7,
    ],
  },
  {
    id: "srv_3",
    key: "albums",
    title: "ВЫПУСКНЫЕ АЛЬБОМЫ",
    time: "индивидуально",
    price: 3500,
    format: "печать под ключ",
    shortDesc: "— печать качественных фотокниг с индивидуальным дизайном",
    paragraphs: [
      "Разрабатываем дизайн и печатаем выпускные альбомы премиум-качества. Никаких шаблонов из интернета: макет собирается под ваш класс или группу, под вашу цветовую гамму и фотографии.",
      "Твёрдая обложка с ламинацией или тканью, плотные развороты, которые раскрываются на 180°, персональная страница для каждого ребёнка с именем и пожеланиями.",
      "По желанию добавляем AR-видео: наводите камеру телефона на страницу — и фотография «оживает» коротким роликом со съёмки.",
      "Перед печатью присылаем полный макет на согласование. Правки вносим бесплатно до тех пор, пока результат не устроит всех родителей.",
    ],
    includes: [
      "Индивидуальный дизайн-макет",
      "Твёрдая обложка и плотные развороты",
      "Персональная страница для каждого",
      "Опция AR-видео на страницах",
    ],
    images: [
      comp2,
      comp4,
      comp6,
    ],
  },
  {
    id: "srv_4",
    key: "host",
    title: "ВЕДУЩИЙ",
    time: "от 4 часов",
    price: 15000,
    format: "любая площадка",
    shortDesc: "— профессиональный ведущий на ваш праздник",
    paragraphs: [
      "Харизматичный ведущий с современной программой — без пошлых конкурсов, кричалок и неловких пауз. Мы делаем праздник, на котором гостям действительно весело.",
      "Сценарий пишем индивидуально: узнаём про компанию, про повод, про истории, которые стоит вспомнить, и вплетаем их в программу. Никаких универсальных заготовок.",
      "Ведущий работает в связке со звукорежиссёром и DJ, поэтому музыка, свет и тайминг идут единым сценарием, а не живут отдельными жизнями.",
      "Перед мероприятием обязательно проводим встречу или созвон, а в день события приезжаем заранее, чтобы проверить площадку и технику.",
    ],
    includes: [
      "Индивидуальный сценарий мероприятия",
      "Музыкальное сопровождение и DJ",
      "Координация тайминга и подрядчиков",
      "Встреча и репетиция до праздника",
    ],
    images: [
      comp7,
      comp1,
      comp3,
      comp5,
    ],
  },
  {
    id: "srv_5",
    key: "desserts",
    title: "ТОРТЫ И ПИРОЖНЫЕ",
    time: "от 2 дней",
    price: 2500,
    format: "доставка по городу",
    shortDesc: "— авторские десерты с уникальным декором",
    paragraphs: [
      "Сотрудничаем с лучшими кондитерами города: торты любой сложности, капкейки, макаруны, кейк-попсы и полноценные кенди-бары.",
      "Десерты оформляем в едином стиле с композициями из воздушных шаров — праздник выглядит собранным, а фотографии получаются идеально «в цвет».",
      "Работаем с начинками на любой вкус, учитываем аллергии и особенности питания: есть варианты без глютена, без лактозы и с пониженным содержанием сахара.",
      "Доставляем в термобоксе прямо к началу мероприятия и сами собираем кенди-бар на площадке.",
    ],
    includes: [
      "Авторский дизайн десерта",
      "Подбор начинок и учёт аллергий",
      "Оформление кенди-бара",
      "Доставка и сборка на площадке",
    ],
    images: [
      comp3,
      comp5,
      comp2,
      comp7,
    ],
  },
  {
    id: "srv_6",
    key: "props",
    title: "РЕКВИЗИТ",
    time: "аренда на сутки",
    price: 1500,
    format: "аренда с доставкой",
    shortDesc: "— аренда стильного декора для ваших съемок",
    paragraphs: [
      "Сдаём в аренду всё, что нужно для красивой фотозоны: каркасы и арки, неоновые вывески, тумбы, колонны, мольберты, пледы и мебель.",
      "Реквизит регулярно обновляется и проверяется перед каждой выдачей — вы не получите поцарапанную тумбу или перегоревший неон.",
      "Привозим, устанавливаем и забираем обратно после мероприятия. Вам не нужно думать о логистике и монтаже.",
      "Можно взять отдельные предметы, а можно готовый комплект под конкретную тему — подберём по вашим референсам.",
    ],
    includes: [
      "Каркасы, арки, тумбы и мебель",
      "Неоновые вывески и подсветка",
      "Доставка, монтаж и демонтаж",
      "Подбор комплекта под тематику",
    ],
    images: [
      comp6,
      comp4,
      comp1,
    ],
  },
  {
    id: "srv_7",
    key: "stylist",
    title: "СТИЛИСТ-ВИЗАЖИСТ",
    time: "от 1.5 часов",
    price: 4000,
    format: "выезд на дом / в студию",
    shortDesc: "— создание идеального образа перед фотосессией",
    paragraphs: [
      "Макияж и укладка любой сложности: от лёгкого нюда для семейной съёмки до вечернего образа для свадьбы или юбилея.",
      "Работаем с выездом на дом, в фотостудию или на площадку мероприятия — вам не нужно никуда ехать с готовой причёской.",
      "Используем только профессиональную косметику, которая выдерживает софиты, вспышку и целый день праздника без коррекции.",
      "По запросу мастер остаётся на площадке для поддержания образа в течение съёмки или мероприятия.",
    ],
    includes: [
      "Обсуждение образа и подбор палитры",
      "Макияж профессиональной косметикой",
      "Укладка или причёска",
      "Выезд к вам и опция сопровождения",
    ],
    images: [
      comp1,
      comp5,
      comp4,
    ],
  },
  {
    id: "srv_8",
    key: "reels",
    title: "СЪЕМКА РИЛСОВ",
    time: "от 1 часа",
    price: 3000,
    format: "вертикальное видео",
    shortDesc: "— трендовые короткие видео для соцсетей",
    paragraphs: [
      "Съёмка и монтаж динамичных вертикальных роликов прямо на вашем мероприятии — Reels, Shorts, клипы для сторис.",
      "Продумываем сценарий переходов, подбираем актуальную музыку и снимаем так, чтобы ролик собирал охваты, а не просто лежал в галерее.",
      "Стабилизированная съёмка на подвес, съёмка деталей декора, эмоций гостей и общих планов площадки — из этого собирается цельная история.",
      "Первые готовые ролики отдаём в течение 24 часов, чтобы вы могли выложить их «по горячим следам».",
    ],
    includes: [
      "Сценарий и подбор трендовой музыки",
      "Съёмка на стабилизатор",
      "Монтаж, переходы и цветокоррекция",
      "Отдача первых роликов за 24 часа",
    ],
    images: [
      comp7,
      comp2,
      comp6,
      comp3,
    ],
  },
];

// --- КАРТОЧКА ОДНОЙ УСЛУГИ ---
const ServiceCard = ({ service }: { service: Service }) => {
  const { addToCart } = useCart();
  const [currentImage, setCurrentImage] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const total = service.images.length;

  const nextImage = () => setCurrentImage((p) => (p + 1) % total);
  const prevImage = () => setCurrentImage((p) => (p - 1 + total) % total);

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    addToCart({
      id: service.id,
      title: service.title,
      price: service.price,
      images: service.images,
    });

    const button = e.currentTarget;
    const cartIcon = document.getElementById("cart-icon-header");

    if (button && cartIcon) {
      const btnRect = button.getBoundingClientRect();
      const cartRect = cartIcon.getBoundingClientRect();

      const flyingDot = document.createElement("div");
      flyingDot.style.position = "fixed";
      flyingDot.style.top = `${btnRect.top + btnRect.height / 2}px`;
      flyingDot.style.left = `${btnRect.left + btnRect.width / 2}px`;
      flyingDot.style.width = "20px";
      flyingDot.style.height = "20px";
      flyingDot.style.backgroundColor = "#6B4E81";
      flyingDot.style.borderRadius = "50%";
      flyingDot.style.zIndex = "9999";
      flyingDot.style.boxShadow = "0 4px 12px rgba(107,78,129,0.4)";
      flyingDot.style.transition = "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
      flyingDot.style.pointerEvents = "none";
      document.body.appendChild(flyingDot);

      requestAnimationFrame(() => {
        flyingDot.style.top = `${cartRect.top + 10}px`;
        flyingDot.style.left = `${cartRect.left + 10}px`;
        flyingDot.style.transform = "scale(0.2)";
        flyingDot.style.opacity = "0.5";
      });

      setTimeout(() => {
        flyingDot.remove();
        cartIcon.classList.add("scale-125");
        setTimeout(() => cartIcon.classList.remove("scale-125"), 200);
      }, 400);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-5 md:p-10 border border-[#E8DEEE] shadow-[0_8px_30px_rgba(107,78,129,0.06)] w-full">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* ===== ЛЕВАЯ ЧАСТЬ: КАРУСЕЛЬ ===== */}
        <div className="w-full lg:w-[45%] shrink-0">
          <div className="relative aspect-[4/5] rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-[#F8F4F9] via-[#F3E9F5] to-[#FFF0F3] group">
            {service.images.map((src, i) => (
              <img
                key={`${service.id}-img-${i}`}
                src={src}
                alt={`${service.title} — фото ${i + 1}`}
                loading="lazy"
                onError={() => setImgErrors((prev) => ({ ...prev, [i]: true }))}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                  imgErrors[i] ? "opacity-0" : ""
                } ${
                  i === currentImage
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-105"
                }`}
              />
            ))}

            {imgErrors[currentImage] && (
              <span className="absolute inset-0 flex items-center justify-center text-[#A093AB] text-xs pointer-events-none">
                Фото {currentImage + 1}
              </span>
            )}

            {/* Плашка времени поверх фото */}
            <span className="absolute top-4 left-4 z-20 text-xs md:text-sm uppercase tracking-widest font-semibold text-[#6B4E81] flex items-center gap-1.5 bg-white/85 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
              <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
              {service.time}
            </span>

            {total > 1 && (
              <>
                <button
                  onClick={prevImage}
                  aria-label="Предыдущее фото"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm text-[#6B4E81] flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 hover:bg-white transition-all duration-300 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  aria-label="Следующее фото"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm text-[#6B4E81] flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 hover:bg-white transition-all duration-300 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                  {service.images.map((_, i) => (
                    <button
                      key={`${service.id}-dot-${i}`}
                      onClick={() => setCurrentImage(i)}
                      aria-label={`Фото ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        i === currentImage
                          ? "w-6 bg-[#6B4E81]"
                          : "w-1.5 bg-white/80 hover:bg-white"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Миниатюры */}
          {total > 1 && (
            <div className="hidden sm:flex gap-3 mt-4">
              {service.images.map((src, i) => (
                <button
                  key={`${service.id}-thumb-${i}`}
                  onClick={() => setCurrentImage(i)}
                  className={`relative flex-1 aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 bg-[#F0E8F4] cursor-pointer ${
                    i === currentImage
                      ? "border-[#6B4E81] opacity-100"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.opacity = "0";
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ===== ПРАВАЯ ЧАСТЬ: ОПИСАНИЕ ===== */}
        <div className="w-full lg:w-[55%] flex flex-col">
          <h3 className="font-serif text-3xl md:text-[2.6rem] font-bold text-[#2D2433] leading-tight uppercase mb-3">
            {service.title}
          </h3>

          <p className="text-base md:text-lg text-[#5A4D66] font-medium leading-relaxed mb-6">
            {service.shortDesc}
          </p>

          {/* Описание услуги. Если текста больше, чем помещается по высоте —
              внутренняя прокрутка, чтобы карточка не растягивалась. */}
          <div className="space-y-4 mb-8 lg:max-h-[360px] lg:overflow-y-auto lg:pr-4 [scrollbar-width:thin] [scrollbar-color:#C9B4D6_transparent]">
            {service.paragraphs.map((text, i) => (
              <p
                key={i}
                className="text-[15px] md:text-base font-medium text-[#5A4D66] leading-relaxed"
              >
                {text}
              </p>
            ))}
          </div>

          {/* ЧТО ВХОДИТ */}
          <div className="bg-[#F8F4F9]/70 rounded-[1.5rem] p-5 md:p-6 mb-6 border border-[#F0E6F3]">
            <h4 className="text-sm uppercase tracking-[0.2em] font-semibold text-[#6B4E81] mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Что входит
            </h4>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {service.includes.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[15px] font-medium text-[#5A4D66] leading-snug"
                >
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-[#6B4E81]/10 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#6B4E81]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ИНФО-БЛОКИ */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white rounded-2xl border border-[#E8DEEE] px-3 py-4 text-center">
              <Wallet className="w-4 h-4 text-[#D4839A] mx-auto mb-2" />
              <div className="text-xs uppercase tracking-widest font-semibold text-[#7E6E8A] mb-1">
                Цена
              </div>
              <div className="font-serif font-bold text-base md:text-lg text-[#6B4E81] leading-none">
                от {service.price.toLocaleString("ru-RU")} ₽
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8DEEE] px-3 py-4 text-center">
              <Clock className="w-4 h-4 text-[#D4839A] mx-auto mb-2" />
              <div className="text-xs uppercase tracking-widest font-semibold text-[#7E6E8A] mb-1">
                Длительность
              </div>
              <div className="text-sm md:text-[15px] font-semibold text-[#2D2433] leading-tight">
                {service.time}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8DEEE] px-3 py-4 text-center">
              <Sparkles className="w-4 h-4 text-[#D4839A] mx-auto mb-2" />
              <div className="text-xs uppercase tracking-widest font-semibold text-[#7E6E8A] mb-1">
                Формат
              </div>
              <div className="text-sm md:text-[15px] font-semibold text-[#2D2433] leading-tight">
                {service.format}
              </div>
            </div>
          </div>

          {/* КНОПКА */}
          <div className="mt-auto pt-5 border-t border-[#F0E6F3] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-serif font-bold text-2xl md:text-3xl text-[#6B4E81]">
              {service.price.toLocaleString("ru-RU")} ₽
            </span>
            <button
              onClick={handleAddToCart}
              className="w-full sm:w-auto bg-[#6B4E81] text-white px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-[#5A4D66] hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" /> Заказать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
export default function Services() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(servicesData[0].key);

  const current =
    servicesData.find((s) => s.key === activeTab) ?? servicesData[0];

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && servicesData.some((s) => s.key === hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  return (
    <div className="bg-[#FDFBFD] text-[#2D2433] overflow-hidden relative scroll-smooth">
      {/* ФОНОВЫЕ ПЯТНА (BLOBS) */}
      <div className="absolute top-[30%] left-[-10%] w-[500px] h-[500px] bg-[#FFB6C1]/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[60%] right-[-10%] w-[600px] h-[600px] bg-[#6B4E81]/15 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[20%] w-[400px] h-[400px] bg-[#D4839A]/20 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* ШАПКА СТРАНИЦЫ — тип «рабочая», общий компонент со страницей
          «Каталог». Раньше та же разметка была написана здесь и там по
          отдельности, и заголовки начали расходиться в цвете и кегле. */}
      <WorkHeader
        crumbs={[{ label: "Главная", to: "/" }, { label: "Услуги" }]}
        title="Услуги"
        lead="Мы подходим к каждому проекту с особым вниманием, создавая арочные украшения, фигуры и цветочные композиции, чтобы сделать ваше мероприятие незабываемым."
        photo={{
          src: "/assets/backservices.jpg",
          alt: "Оформление праздника композициями из воздушных шаров",
        }}
      />

      {/* ИНТЕРАКТИВНЫЕ ВКЛАДКИ (ТАБЫ) — как в Каталоге.
          scrollbar-hide вместо прежних инлайновых стилей: те закрывали
          Firefox и старый IE, но не WebKit, поэтому в Chrome и Safari под
          вкладками всё равно оставалась полоса прокрутки.
          mb-12/16 — чтобы тёмная черта активного раздела не липла к карточке
          ниже и читалась как подчёркивание, а не как рамка карточки. */}
      <div
        id="services-content"
        // mb-8 — то же значение, что в каталоге, чтобы вкладки на обеих
        // страницах отстояли от контента одинаково.
        className="scrollbar-hide relative z-20 w-full overflow-x-auto border-b border-[#E8DEEE] pt-6 mb-8"
      >
        {/* 79rem = 76rem контента + 2×24px (px-6): внутренний край совпадает
            с логотипом/кнопкой шапки, у которой padding снаружи контейнера */}
        <div className="max-w-[79rem] mx-auto px-6">
          <div className="flex justify-between items-center min-w-max w-full gap-8">
            {servicesData.map((srv) => (
              <button
                key={srv.key}
                onClick={() => setActiveTab(srv.key)}
                // Активная вкладка — тёмная полоса и тот же тёмный, что у
                // заголовка шапки: связывает панель с ней в один блок.
                // Неактивные подняты с #A093AB до #7E6E8A: прежний был
                // светловат и на белом читался с трудом.
                // tracking-wider вместо widest: при gap-10 восемь пунктов
                // переставали влезать в строку (1489px против 1425px) и на
                // десктопе включалась ненужная горизонтальная прокрутка.
                // Разрядку внутри слов ужали, промежутки между пунктами
                // выросли — воздух там, где он и нужен.
                className={`text-xs uppercase tracking-wider font-semibold transition-colors duration-300 pb-4 border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === srv.key
                    ? "text-[#2D2433] border-[#2D2433]"
                    : "text-[#7E6E8A] border-transparent hover:text-[#2D2433] hover:border-[#D9C6E4]"
                }`}
              >
                {srv.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* СОДЕРЖИМОЕ АКТИВНОЙ УСЛУГИ */}
      <div className="relative z-20 max-w-[79rem] mx-auto px-4 md:px-6 pb-12 min-h-[40vh]">
        <div
          key={current.key}
          className="animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both"
        >
          <ServiceCard service={current} />
        </div>
      </div>

      {/* НАШ ПОДХОД.
          Раньше здесь была гигантская рукописная надпись во весь экран и три
          карточки, расставленные абсолютом с поворотами вдоль волнистой SVG-
          линии. Всё это убрано: и надпись, и линия, и повороты.

          Контейнер max-w-[79rem] px-6 — тот же, что у шапки, панели вкладок и
          карточки услуги выше. Это важнее, чем предложенный max-w-7xl px-4:
          иначе левый и правый край блока разъедутся с остальной страницей,
          которую мы как раз выравнивали. */}
      {/* Отступы намеренно несимметричные: сверху блок подтянут к карточке
          услуги, снизу отодвинут от футера. Так он читается как продолжение
          страницы, а не как приклеенный к подвалу довесок. */}
      <section className="relative z-10 w-full pt-8 pb-24 md:pt-10 md:pb-32">
        <div className="mx-auto w-full max-w-[79rem] px-6">
          {/* Двухуровневый заголовок. Рукописный шрифт остался в проекте
              (font-miana — тот же, что у логотипа), но теперь работает как
              изящная подпись над заголовком, а не как фон во весь экран. */}
          {/*
            Рукописный шрифт роняет у «д» длинный росчерк: замерено, он уходит
            на 0.867em ниже базовой линии, тогда как сам шрифт объявляет себе
            метрический descent всего 0.2em. Браузер резервирует место по
            метрике, поэтому при leading-none хвост торчал на 0.667em за
            пределы строки и ложился прямо на заголовок.

            pb-[0.67em] — ровно эта разница: подкладываем недостающее место
            под росчерк. В em, а не в px, чтобы работало и на мобильном кегле.
            mb-7 — уже настоящий видимый зазор до заголовка.

            -translate-x — оптическая поправка. По метрикам подпись отцентрована
            идеально (расхождение 0.3px), но росчерк «д» добавляет веса справа,
            и слово кажется сдвинутым. transform не влияет на поток, поэтому
            сдвиг ничего не ломает.
          */}
          {/* Пара «рукописная надстрочка + спокойный заголовок» — та же, что
              в призыве к действию на странице «О нас». Розовый рукописный
              задаёт тёплую ноту, заголовок под ним набран строчными и весом
              600: капслок здесь читался как окрик и спорил с подписью. */}
          <p className="font-miana mb-4 -translate-x-[0.3em] pb-[0.5em] text-center text-2xl leading-none text-[#C46B8A] md:text-3xl">
            наш подход
          </p>

          <h2 className="mb-12 text-center text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
            Не только дизайнерские шары
          </h2>

          {/* Строгая сетка вместо разбросанных карточек: одинаковая ширина,
              одна базовая линия, равные промежутки. items-stretch по умолчанию,
              поэтому карточки с разным объёмом текста держат общую высоту. */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: "Под ключ",
                text: "Полный комплекс услуг для создания идеального праздника",
              },
              {
                title: "Команда",
                text: "От визажиста до ведущего — мы соберем лучших специалистов",
              },
              {
                title: "Спокойствие",
                text: "Доверьте организацию профессионалам, а сами наслаждайтесь моментом",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col items-center justify-center rounded-3xl bg-white px-8 py-10 text-center shadow-[0_4px_20px_rgba(45,36,56,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(45,36,56,0.10)]"
              >
                {/* Мини-заголовок держит фирменный тёмный, описание идёт на
                    тон мягче — иерархия читается сразу, без линеек и иконок. */}
                <h3 className="mb-3 text-sm font-bold tracking-widest text-[#2D2433] uppercase">
                  {card.title}
                </h3>
                <p className="text-base leading-relaxed font-normal text-[#5A4D66]">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
