import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Heart,
  ShieldCheck,
  Clock,
} from "lucide-react";

import { CoverHeader } from "./components/ui/PageHeader";
import { SkyBackdrop } from "./components/ui/SkyBackdrop";

// Импортируем видео и фото
import reel1 from "./assets/reel-1.mp4";
import reel2 from "./assets/reel-2.mp4";
import reel3 from "./assets/reel-3.mp4";
import reel4 from "./assets/reel-4.mp4";
import reel5 from "./assets/reel-5.mp4";
import founderImg from "./assets/founder.jpg";

const reelsData = [
  { id: 0, title: "Создание гигантской арки", videoUrl: reel1 },
  { id: 1, title: "Атмосфера на детском празднике", videoUrl: reel2 },
  { id: 2, title: "Сборка композиции с цифрой", videoUrl: reel3 },
  { id: 3, title: "Декор для фотосессии", videoUrl: reel4 },
  { id: 4, title: "Праздничная фотозона", videoUrl: reel5 },
];

/* Рассказ Нины. Раньше это были четыре карточки со своими заголовками и
   слайдером; теперь — один текст сверху вниз, поэтому бывшие заголовки
   («Почему именно Студия?», «Почему воздушные шарики?») вплетены в сам
   текст вопросами. Первый абзац — лид, он крупнее остальных. */
const founderStory = [
  "Меня зовут Нина, я организатор самого тёплого и душевного пространства по созданию авторских композиций из воздушных шариков. Наша студия — это место, где праздник обретает форму и вдохновение.",
  "Почему именно студия? Потому что меня окружает настоящая команда профессионалов и творческих личностей. Мы вместе создаём красоту, дарим праздник и вкладываем весь накопленный опыт, знания и мастерство в каждый ваш заказ.",
  "А почему воздушные шарики? Потому что шарик — это счастье, которое стремится вверх. Я мама и точно знаю, что дети в абсолютном восторге от шаров. А мы, взрослые, при виде них снова погружаемся в беззаботное детство, где легко, воздушно и хочется улыбаться.",
  "Почувствуйте наше душевное гостеприимство. Приглашайте друзей — близких много не бывает. Вы обязательно откроете для себя много интересного про воздушный мир и подарите своим любимым незабываемые эмоции.",
];

/* ────────────────────────────────────────────────────────────────────────
   Счётчик, который стартует, когда плашка появляется на экране.

   Наблюдатель отключается сразу после первого срабатывания: цифра должна
   отсчитаться один раз, а не заново при каждой прокрутке мимо неё.

   Считаем в requestAnimationFrame, а не в setInterval: шаг привязан к
   реальному времени (performance.now), поэтому на медленном устройстве
   счётчик не растянется, а просто пойдёт крупнее шагом и придёт к финалу
   за те же 1.6 с. easeOutCubic — быстрый старт и мягкая остановка ровно
   на итоговом числе, без «доползания» последних единиц.

   prefers-reduced-motion уважаем так же, как в Hero: при системной
   настройке «меньше движения» просто показываем итог, без анимации.
   ──────────────────────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600) {
  // Стартуем сразу с итогового числа, а не с нуля. Иначе статичный рендер
  // (скрин от начала страницы, превью-краулер, печать) ловил голый «0», и
  // это читалось как поломка. Сама анимация всё равно идёт от нуля — она
  // обнуляет значение в первый кадр, когда плашка уже в зоне видимости.
  const [value, setValue] = useState(target);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;

      const from = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - from) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      setValue(0); // отсчёт всегда виден от нуля — но только когда реально идёт
      raf = requestAnimationFrame(tick);
    };

    // Плашка уже на экране в момент монтирования — запускаем отсчёт сразу,
    // не дожидаясь наблюдателя (он зависит от цикла отрисовки и в некоторых
    // окружениях не срабатывает). Прямой замер getBoundingClientRect надёжен.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) start();

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        start();
      },
      // Ждём, пока плашка видна на 40%: иначе цифры отсчитались бы,
      // пока блок только показался нижним краем и его ещё не читают.
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return { ref, value };
}

export default function About() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  /* Полоса воспроизведения двигается ЧЕРЕЗ REF, а не через состояние.

     Раньше здесь был useState, а onTimeUpdate вызывал setProgress —
     то есть браузер перерисовывал всю страницу «О нас» (1783 узла, пять
     тегов video, карусель и счётчики) по четыре раза в секунду, пока
     играет ролик. Это и была основная причина проседания кадров.

     Ширину полосы теперь пишем прямо в стиль элемента: видео играет,
     полоса едет, React в этом не участвует вообще. */
  const progressRef = useRef<HTMLDivElement | null>(null);
  const setProgress = (pct: number) => {
    if (progressRef.current) progressRef.current.style.width = `${pct}%`;
  };

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Геометрия веера считается в пикселях в JS, поэтому брейкпоинт приходится
  // знать здесь, а не отдавать классам Tailwind. matchMedia, а не resize:
  // событие приходит один раз на пересечении порога, а не на каждый пиксель
  // перетаскивания окна.
  // Три уровня раскладки веера. Дальний ряд (3-й план) показываем только с
  // 1200px: ниже этого половина сцены меньше 555px, и дальняя карточка
  // упиралась в край — то самое обрезание по краям. От 768 до 1200 — три
  // карточки с поджатым шагом. Ниже 768 боковые намеренно уходят за край
  // (мобильный «подсмотр»), их режет overflow-hidden секции.
  const [tier, setTier] = useState<"mobile" | "mid" | "wide">("wide");

  useEffect(() => {
    const mqMid = window.matchMedia("(min-width: 768px)");
    const mqWide = window.matchMedia("(min-width: 1200px)");
    const sync = () =>
      setTier(mqWide.matches ? "wide" : mqMid.matches ? "mid" : "mobile");
    sync();
    mqMid.addEventListener("change", sync);
    mqWide.addEventListener("change", sync);
    return () => {
      mqMid.removeEventListener("change", sync);
      mqWide.removeEventListener("change", sync);
    };
  }, []);

  // Хуки вызываем на верхнем уровне, а готовые счётчики раздаём в данные
  // ниже: внутри map хук вызвать нельзя, а плашек с цифрами всего две.
  const years = useCountUp(5);
  const events = useCountUp(3000);

  const stats = [
    {
      icon: Sparkles,
      counter: years,
      suffix: "+ лет",
      label: "Дарим праздник и яркие эмоции",
    },
    {
      icon: Heart,
      counter: events,
      suffix: "+",
      label: "Оформленных мероприятий",
    },
    {
      icon: ShieldCheck,
      value: "Hi-Float",
      label: "Обработка для долгого полёта",
    },
    {
      icon: Clock,
      value: "24/7",
      label: "Бережная доставка точно ко времени",
    },
  ];

  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      if (idx === activeIndex) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    setProgress(0);
    setIsPaused(false);
  }, [activeIndex]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % reelsData.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + reelsData.length) % reelsData.length);
  };

  const handleTimeUpdate = (idx: number) => {
    if (idx === activeIndex && videoRefs.current[idx]) {
      const current = videoRefs.current[idx]!.currentTime;
      const total = videoRefs.current[idx]!.duration || 1;
      setProgress((current / total) * 100);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const activeVideo = videoRefs.current[activeIndex];
    if (activeVideo) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newPct = Math.max(0, Math.min(1, clickX / rect.width));
      activeVideo.currentTime = newPct * activeVideo.duration;
      setProgress(newPct * 100);
    }
  };

  const handleHoldStart = (idx: number) => {
    if (idx === activeIndex && videoRefs.current[idx]) {
      videoRefs.current[idx]!.pause();
      setIsPaused(true);
    }
  };

  const handleHoldEnd = (idx: number) => {
    if (idx === activeIndex && videoRefs.current[idx]) {
      videoRefs.current[idx]!.play();
      setIsPaused(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRefs.current.forEach((v) => {
      if (v) v.muted = nextMute;
    });
  };

  return (
    <div className="relative overflow-hidden bg-[#FDFBFD] text-[#2D2433] scroll-smooth">
      {/* Верхняя полоса неба — та же, что открывает Акции и Ленту, чтобы
          верхушки всех трёх «обложек» совпадали. Только верх: нижнюю
          полосу и собственные пятна компонента выключаем — у «О нас»
          середина и низ держатся на своих пятнах ниже. */}
      <SkyBackdrop bottom={false} blobs={false} />

      {/* ФОНОВЫЕ ПЯТНА (BLOBS).
          Тот же приём, что на Услугах: убирают стерильную белизну, не
          добавляя ни одной линии. Лежат на z-0, все секции ниже идут с
          relative z-10 и рисуются поверх.

          aria-hidden + pointer-events-none: они декоративные, им нечего
          делать в озвучке и незачем перехватывать курсор.
          overflow-hidden у корня обрезает их по краям страницы, поэтому
          горизонтальной прокрутки от них не появляется. */}
      {/* Плотность выше, чем /15 и /10 из первого захода: на снимке всей
          страницы при таком радиусе размытия цвет размазывался настолько,
          что середина оставалась белой — то есть ровно та стерильность,
          против которой пятна и ставились. Пятен пять, а не четыре:
          пятое закрывает разворот с Ниной, где раньше был провал. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute top-[2%] left-[-10%] h-[560px] w-[560px] rounded-full bg-[#FFB6C1]/30 blur-[120px]" />
        <div className="absolute top-[16%] right-[-8%] h-[520px] w-[520px] rounded-full bg-[#6B4E81]/14 blur-[130px]" />
        <div className="absolute top-[34%] left-[-6%] h-[600px] w-[600px] rounded-full bg-[#D4839A]/22 blur-[150px]" />
        <div className="absolute top-[58%] right-[-10%] h-[620px] w-[620px] rounded-full bg-[#6B4E81]/16 blur-[150px]" />
        <div className="absolute bottom-[-4%] left-[10%] h-[520px] w-[520px] rounded-full bg-[#FFB6C1]/26 blur-[130px]" />
      </div>

      {/* ШАПКА СТРАНИЦЫ — тип «обложка», как на Акциях и Ленте.
          До этого у «О нас» шапки не было вообще: страница начиналась сразу
          с карусели, а её h1 был заголовком первой секции. */}
      <CoverHeader
        eyebrow="знакомьтесь"
        title="О нас"
        lead="Мы очень любим то, что делаем, и часто снимаем результат на видео. Это красивые моменты и наша эстетика, которой хочется с вами поделиться."
      />

      {/* ══════════════════════════════════════════════════════════════════
          1. КАРУСЕЛЬ РИЛСОВ
          ══════════════════════════════════════════════════════════════════ */}
      {/* max-w-[79rem] px-6 — тот же контейнер, что у шапки сайта и у секций
          на Каталоге и Услугах. */}
      {/* pt-0: отступ сверху даёт шапка страницы (pb-14/16). Свой заголовок
          у секции убран — он дублировал бы «О нас» из шапки; карусель
          начинается сразу, как и на других «обложках». */}
      <section className="relative z-10 mx-auto max-w-[79rem] overflow-x-clip px-6 pt-0 pb-10 md:pb-12">
        {/* Сцена с карточками */}
        <div className="relative flex h-[588px] items-center justify-center md:h-[648px]">
          {/* СТРЕЛКИ.
              На десктопе отсчитываются от центра сцены через ml, а не через
              translate: так обе кнопки стоят на одинаковом расстоянии от
              середины (раньше левая была на -220, правая на +165 — перекос
              был заметен). Ширина кнопки учтена, центры выходят на ±208 —
              за пределами активной карточки, но поверх соседних.

              На телефоне отсчёт от центра не годится: замерено на 390px —
              левая кнопка уезжала за край экрана на 24px, правая на столько
              же обрезалась справа. Поэтому до md они прижаты к краям сцены
              (left-2 / right-2) и слегка перекрывают активную карточку —
              обычное поведение мобильной карусели. Симметрия сохраняется:
              обе оказываются в 159px от середины. */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Предыдущее видео"
            className="absolute left-2 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[#E8DEEE] bg-white/85 text-[#6B4E81] shadow-[0_10px_25px_rgba(45,36,51,0.12)] backdrop-blur-md transition duration-300 hover:scale-110 hover:bg-white active:scale-95 md:left-1/2 md:-ml-[257px] md:h-16 md:w-16"
          >
            <ChevronLeft className="h-7 w-7 md:h-8 md:w-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Следующее видео"
            className="absolute right-2 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[#E8DEEE] bg-white/85 text-[#6B4E81] shadow-[0_10px_25px_rgba(45,36,51,0.12)] backdrop-blur-md transition duration-300 hover:scale-110 hover:bg-white active:scale-95 md:right-auto md:left-1/2 md:ml-[193px] md:h-16 md:w-16"
          >
            <ChevronRight className="h-7 w-7 md:h-8 md:w-8" />
          </button>

          {reelsData.map((reel, idx) => {
            const count = reelsData.length;
            let offset = idx - activeIndex;
            if (offset > count / 2) offset -= count;
            if (offset < -count / 2) offset += count;

            const isActive = offset === 0;
            const isVisible = Math.abs(offset) <= (tier === "wide" ? 2 : 1);

            if (!isVisible) return null;

            /* ВЕЕР С ПЕРСПЕКТИВОЙ.

               Раньше обе боковые карточки имели один масштаб 0.9 и стояли с
               равным шагом 240px. При ширине 288px соседние перекрывались на
               48px, и вместо глубины получалась стопка обрезков: размер не
               убывал, поэтому дальняя карточка ничем не отличалась от ближней.

               Теперь масштаб и шаг заданы таблицей по удалённости. Числа
               подобраны так, чтобы видимая полоска каждой следующей карточки
               была примерно одинаковой (~66px перекрытия):
                 активная  352px (1.1)  центр 0     края -176..176
                 соседняя  282px (0.88) центр 250   края  109..391
                 дальняя   230px (0.72) центр 440   края  325..555
               555px < 616px — половины сцены, поэтому веер целиком помещается
               в контейнер и не режется по краю.

               На телефоне шаг сжат, а дальний ряд вообще скрыт (ниже по
               isVisible): на 390px он всё равно ушёл бы за экран, а мельтешение
               обрезков у края только мешает. */
            const STEP =
              tier === "wide"
                ? [0, 250, 440]
                : tier === "mid"
                  ? [0, 200]
                  : [0, 150];
            const SCALE = [1.1, 0.88, 0.72];
            // Плотность вуали цвета фона поверх неактивных карточек. Подняли
            // выше прежних 0.5/0.72: боковые ролики должны заметно уходить в
            // фон, а не читаться как полноценные кадры рядом с активным.
            const VEIL = [0, 0.66, 0.85];

            const depth = Math.abs(offset);
            const translateX = Math.sign(offset) * STEP[depth];
            const scale = SCALE[depth];
            const veil = VEIL[depth];
            const zIndex = 30 - depth * 10;

            return (
              <div
                key={reel.id}
                aria-label={reel.title}
                onClick={() => !isActive && setActiveIndex(idx)}
                onMouseDown={() => handleHoldStart(idx)}
                onMouseUp={() => handleHoldEnd(idx)}
                onMouseLeave={() => handleHoldEnd(idx)}
                onTouchStart={() => handleHoldStart(idx)}
                onTouchEnd={() => handleHoldEnd(idx)}
                style={{
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  zIndex,
                }}
                // duration-700 вместо 500 и мягкая кривая: карточки не
                // «щёлкают» между позициями, а переезжают.
                className={`absolute aspect-[9/16] w-72 overflow-hidden rounded-3xl bg-[#F0E5F5] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] select-none md:w-80 ${
                  isActive
                    ? "cursor-grab shadow-[0_50px_100px_-20px_rgba(107,78,129,0.4),0_20px_50px_-15px_rgba(107,78,129,0.25)] active:cursor-grabbing"
                    : "cursor-pointer shadow-none"
                }`}
              >
                <video
                  ref={(el) => {
                    videoRefs.current[idx] = el;
                  }}
                  src={reel.videoUrl}
                  muted={isMuted}
                  playsInline
                  /* Неактивные ролики не подгружаем заранее: их пять, и
                     вместе они весят 45 МБ. Браузер по умолчанию тянул их
                     все сразу — страница «О нас» съедала весь канал и
                     подтормаживала. Активный грузится целиком, соседние —
                     только первый кадр, чтобы переключение не мигало. */
                  preload={
                    idx === activeIndex
                      ? "auto"
                      : Math.abs(idx - activeIndex) === 1
                        ? "metadata"
                        : "none"
                  }
                  onEnded={handleNext}
                  onTimeUpdate={() => handleTimeUpdate(idx)}
                  className="pointer-events-none h-full w-full object-cover"
                />

                {!isActive && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: "#FDFBFD", opacity: veil }}
                  />
                )}

                {isActive && isPaused && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#2D2433] shadow-lg">
                      <div className="flex gap-1.5">
                        <div className="h-6 w-1.5 rounded-full bg-[#2D2433]" />
                        <div className="h-6 w-1.5 rounded-full bg-[#2D2433]" />
                      </div>
                    </div>
                  </div>
                )}

                {isActive && (
                  <button
                    onClick={toggleMute}
                    aria-label="Переключить звук"
                    className="absolute top-4 right-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                )}

                {/* ПОЛОСА ВОСПРОИЗВЕДЕНИЯ.

                    Внешний слой — только поле для нажатия: двенадцать
                    пикселей, чтобы в него попадал палец. Раньше у него был
                    фон bg-black/30, и он читался как широкая тёмная плашка
                    поверх кадра: над тонкой полоской таймера висела вторая,
                    ничего не значащая. Теперь он прозрачный — площадь
                    нажатия та же, видно только сам таймер.

                    Дорожка при этом стала тёмной вместо белой: ролики
                    светлые, и прежняя white/30 на них пропадала — заметна
                    она была лишь на фоне той самой плашки. */}
                {isActive && (
                  <div
                    onClick={handleSeek}
                    className="absolute right-0 bottom-0 left-0 z-30 flex h-3 cursor-pointer items-end transition-all hover:h-4"
                  >
                    <div className="relative h-1 w-full bg-black/25 hover:h-1.5">
                      <div
                        ref={progressRef}
                        className="h-full bg-white transition-all duration-75"
                        style={{ width: 0 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. ЗНАКОМСТВО С НИНОЙ — журнальный разворот
          ══════════════════════════════════════════════════════════════════ */}
      {/* Ни карточки, ни подложки, ни слайдера: фотография и текст лежат
          прямо на фоне страницы. Асимметрия задана сеткой — фото занимает
          пять колонок из двенадцати, текст шесть и начинается с седьмой,
          так между ними остаётся пустая колонка-воздух. */}
      {/* Z-паттерн: фото слева — текст справа, затем текст слева — фото
          справа. Взгляд идёт зигзагом и на каждой строке получает новую
          опору, поэтому длинный рассказ не выглядит сплошной простынёй.
          Прежняя вёрстка с columns-2 убрана целиком: две колонки под
          одиночным фото разрывали блок на несвязанные куски. */}
      <section className="relative z-10 mx-auto max-w-[79rem] px-6 pt-4 pb-10 md:pt-6 md:pb-10">
        {/* ── СТРОКА 1: фото слева, текст справа ─────────────────────────
            items-center выравнивает текст по середине фотографии: колонки
            разной высоты, и без этого текст прилипал бы к верхнему краю,
            оставляя под собой пустоту. */}
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
          <div className="w-full md:w-[45%]">
            <div className="group overflow-hidden rounded-[2rem] bg-[#F8F4F9] shadow-[0_24px_60px_-20px_rgba(107,78,129,0.35)]">
              <img
                src={founderImg}
                alt="Нина — основатель студии «Шары Для Души»"
                className="aspect-square w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            </div>
          </div>

          <div className="w-full md:w-[55%]">
            <p className="text-[13px] font-semibold tracking-widest text-[#6B4E81] uppercase">
              Знакомство
            </p>

            {/* Строчными, а не капсом, и вес 600 вместо 800: набранная
                капслоком фраза читается как окрик, а тут нужен спокойный
                тон. Заодно капс лишает слова привычного силуэта — строчные
                с выносными элементами узнаются быстрее.
                tracking почти нейтральный: сжимать имеет смысл капс, у
                строчных от этого только слипаются буквы. */}
            <h2 className="mt-3 text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
              Добро пожаловать в «Шары&nbsp;Для&nbsp;Души»
            </h2>

            {/* ЛИД. Крупнее остальных абзацев и фирменным фиолетовым — глаз
                сразу находит, откуда начинать читать.

                ⚠️ Курсив здесь синтетический: в проекте загружен только
                прямой вариативный Montserrat, курсивного начертания нет,
                поэтому браузер наклоняет буквы механическим скосом. На
                крупном кегле это заметно. Настоящий курсив = добавить
                файлы montserrat-*-wght-italic.woff2 в public/fonts и
                второй набор @font-face с font-style: italic. */}
            <p className="mt-5 text-lg leading-[1.7] font-medium text-[#6B4E81] italic md:text-xl">
              {founderStory[0]}
            </p>

            <p className="mt-4 text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
              {founderStory[1]}
            </p>
          </div>
        </div>

        {/* ── СТРОКА 2: текст слева, фото справа ─────────────────────────
            order переворачивает пару только на десктопе. На телефоне обе
            строки идут одинаково — сначала фотография, потом текст: так у
            каждого куска рассказа есть своя картинка сверху, и обе строки
            читаются по одному правилу. Без order фото второй строки уехало
            бы под текст и ритм сбился бы. */}
        <div className="mt-10 flex flex-col items-center gap-8 md:mt-14 md:flex-row md:gap-12">
          <div className="order-2 w-full md:order-1 md:w-[55%]">
            <p className="text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
              {founderStory[2]}
            </p>
            <p className="mt-4 text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
              {founderStory[3]}
            </p>

            {/* Рукописная подпись в конце письма. */}
            <p className="font-miana mt-6 pb-[0.4em] text-3xl leading-none text-[#C46B8A]">
              С теплом, Нина
            </p>
          </div>

          {/* ВТОРОЙ КАДР — логотип студии.
              logo.jpg лежит в public/assets, поэтому берём его строковым
              путём "/assets/logo.jpg", а не импортом (импорт — только для
              файлов из src/assets).

              object-contain, а не cover: logo.jpg квадратный, а бокс 4:3 —
              cover срезал бы у логотипа верх и низ вместе с рамкой и
              подписью. Фон бокса #F0E5F5 совпадает с фоном самого логотипа,
              поэтому поля по бокам не видны — кадр выглядит цельным. */}
          <div className="group order-1 w-full md:order-2 md:w-[45%]">
            <div className="overflow-hidden rounded-[2rem] bg-[#F0E5F5] shadow-[0_24px_60px_-20px_rgba(107,78,129,0.35)]">
              <img
                src="/assets/logo.jpg"
                alt="Логотип студии «Шары Для Души»"
                loading="lazy"
                className="aspect-[4/3] w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. ФИЛОСОФИЯ И ЦИФРЫ
          ══════════════════════════════════════════════════════════════════ */}
      {/* Фон-фото по тому же принципу, что первый экран и FAQ на главной:
          снимок под лёгким размытием + полупрозрачная вуаль сверху. Вуаль
          здесь СВЕТЛАЯ (а не тёмная, как на главной): текст в блоке тёмный,
          поэтому фото гасится к светлому. Сверху и снизу — растворение в
          фон страницы, чтобы кадр не обрывался жёстким краем.
          Разделительной линии больше нет — границу секции держит сам фон. */}
      <section className="relative z-10 overflow-hidden py-16 md:py-24">
        {/* Маска на ОБЁРТКЕ, а не два градиента поверх. Прежние накладки
            гасили только фон, но сами имели чёткую границу в 112px, и сверху
            была видна ровная горизонтальная линия — кадр обрывался. Маска
            растворяет снимок вместе с вуалью в единое целое, поэтому границы
            секции просто нет.

            Растворение и по бокам тоже: у back1.jpg плотность неравномерная
            (слева облака, справа почти пусто), и без боковых полей левый край
            перетягивал внимание на себя.

            blur поднят с 3 до 7px, добавлен saturate(0.75): у рисунка жёсткие
            контуры, а вуаль их не скрывает — она только осветляет. Убирает
            именно размытие. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%), linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%), linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          <img
            src="/assets/back1.jpg"
            alt=""
            className="h-full w-full object-cover"
            style={{ filter: "blur(7px) brightness(1.06) saturate(0.75)" }}
          />
          <div className="absolute inset-0 bg-[#FBF7FC]/86" />
        </div>

        <div className="relative mx-auto max-w-[79rem] px-6">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12 md:gap-10">
            {/* Текст шире цифр: семь колонок против пяти. */}
            <div className="md:col-span-7">
              <p className="text-[13px] font-semibold tracking-widest text-[#6B4E81] uppercase">
                Наша философия
              </p>
              <h2 className="mt-4 text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
                Больше, чем просто воздушные шары
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed font-medium text-[#5A4D66] md:text-[17px]">
                Мы верим, что каждый праздник — это уникальная история и тёплые
                воспоминания, которые остаются на всю жизнь. Мы разрабатываем
                индивидуальные концепции, подбираем гармоничные палитры и
                бережно доставляем эмоции точно к вашему событию.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-5">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex flex-col justify-between rounded-3xl border border-[#E8DEEE] bg-white/80 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(107,78,129,0.08)]"
                  >
                    <Icon className="h-6 w-6 text-[#6B4E81]" />
                    <div className="mt-6">
                      {/* tabular-nums — цифры одинаковой ширины. Без него
                        плашка едва заметно дёргается на каждом кадре
                        отсчёта, пока меняется разряд. */}
                      <p className="text-3xl font-extrabold tracking-[-0.02em] text-[#2D2433] tabular-nums">
                        {stat.counter ? (
                          <>
                            <span ref={stat.counter.ref}>
                              {stat.counter.value}
                            </span>
                            {stat.suffix}
                          </>
                        ) : (
                          stat.value
                        )}
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-[#5A4D66] md:text-[15px]">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. ПРИЗЫВ К ДЕЙСТВИЮ
          ══════════════════════════════════════════════════════════════════ */}
      {/* Линию-разделитель убрали: отступа сверху достаточно, чтобы блок
          читался отдельно, а лишних черт на странице больше нет. */}
      <section className="relative z-10 mx-auto max-w-[79rem] px-6 pt-14 pb-20 md:pt-20 md:pb-28">
        <div className="text-center">
          <p className="font-miana pb-[0.5em] text-2xl leading-none text-[#C46B8A] md:text-3xl">
            будем знакомы ближе
          </p>

          <h2 className="mx-auto max-w-3xl text-[1.9rem] leading-[1.15] font-semibold tracking-[-0.01em] text-[#2D2433] md:text-[2.6rem] md:leading-[1.12]">
            Доверьте нам атмосферу вашего следующего праздника
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base font-medium text-[#7E6E8A] md:text-[17px]">
            Создадим индивидуальный проект под ваш бюджет и пожелания.
          </p>

          <Link
            to="/catalog"
            className="group mt-10 inline-flex items-center gap-3 rounded-xl bg-[#6B4E81] px-8 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(107,78,129,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5A4D66]"
          >
            Перейти в каталог
            {/* Стрелка уезжает вправо на наведении — микродвижение, которое
                читается как «переход», без анимации самой кнопки. */}
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}
