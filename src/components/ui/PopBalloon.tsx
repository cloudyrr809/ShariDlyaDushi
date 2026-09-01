import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Пасхалка: шарики поочерёдно всплывают в пустых полях по бокам страницы.
 * По клику лопаются.
 *
 * ОЧЕРЕДЬ, А НЕ ДВА НЕЗАВИСИМЫХ ТАЙМЕРА. Раньше слева и справа жили две
 * копии компонента, каждая со своим расписанием: они то стартовали разом,
 * то надолго пропадали обе. Теперь шарики идут цепочкой — следующий
 * вылетает с ПРОТИВОПОЛОЖНОЙ стороны, когда предыдущий прошёл середину
 * экрана, плюс случайная пауза. Получается разговор двух сторон, а не
 * два параллельных скрипта.
 *
 * Случайно всё: скорость, сдвиг вбок, размер, сам шарик и длина паузы.
 * Поэтому ритм не читается как расписание.
 *
 * aria-hidden и tabIndex={-1} намеренно НЕ ставим: это интерактивный
 * элемент, и для клавиатуры он тоже должен работать. Но роль у него
 * декоративная, поэтому подпись честно говорит, что это игрушка.
 */
const SHARDS = [
  { dx: "-46px", dy: "-38px", c: "#C46B8A" },
  { dx: "42px", dy: "-44px", c: "#6B4E81" },
  { dx: "-54px", dy: "16px", c: "#E8A0BC" },
  { dx: "50px", dy: "22px", c: "#A64D6C" },
  { dx: "-18px", dy: "-58px", c: "#B9A0D0" },
  { dx: "22px", dy: "52px", c: "#C46B8A" },
  { dx: "-34px", dy: "48px", c: "#6B4E81" },
  { dx: "38px", dy: "-14px", c: "#E8A0BC" },
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Ширина шарика — доля свободного поля сбоку, а не число пикселей.

    Поле считается так: контент сайта 79rem по центру, значит с каждой
    стороны остаётся (100vw − 79rem)/2, плюс внутренний отступ 1.5rem,
    который тоже свободен. При 1440px это 112px, при 1920px — 352px.

    Раньше размер был жёстким (86px, потом 118px), и приходилось выбирать:
    либо шарик мелкий на большом мониторе, либо он заезжает на фотографии
    на ноутбуке. Доля поля решает обе беды разом. Потолок 150px — чтобы на
    широком мониторе пасхалка не превратилась в главный объект страницы. */
const WIDTH = "min(((100vw - 79rem) / 2 + 1.5rem) * 0.85, 150px)";

/* Ниже 1420px поля сбоку почти нет (при 1366px — всего 75px), и шарик
   размером с ноготь смысла не имеет: там он просто не показывается.
   Порог стоит классом min-[1420px]:block в разметке ниже. */

/** Пауза после того, как предыдущий шарик прошёл середину экрана. */
const GAP_MIN = 1200;
const GAP_MAX = 5200;

/** Сколько шариков может быть на экране одновременно.

    Двух хватает на перехлёст: предыдущий ещё уходит вверх, следующий уже
    показался снизу. Больше — это уже не пасхалка, а стая. */
const MAX_ON_SCREEN = 2;

type Side = "left" | "right";

type Flight = {
  id: number;
  side: Side;
  /** секунд на пролёт */
  dur: number;
  /** сдвиг вбок в долях ширины шарика, % — см. пояснение в launch */
  dx: number;
  /** масштаб шарика */
  scale: number;
  /** период покачивания, с */
  sway: number;
  src: string;
  /** лопнули — показываем осколки */
  popped: boolean;
};

export function PopBalloons({
  left,
  right,
}: {
  /** картинки для левой стороны */
  left: string[];
  /** картинки для правой стороны */
  right: string[];
}) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);

  /* Системная настройка «меньше движения»: пасхалку просто не показываем.
     Гасить анимацию нельзя — компонент ждёт событие её окончания, чтобы
     убрать шарик, и он застрял бы посреди экрана. */
  const [calm] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  /* Сторона, чей вылет отложен до возвращения на вкладку.

     БЕЗ ЭТОГО ШАРИКИ СЛИПАЛИСЬ В СТАЮ. В фоновой вкладке браузер
     останавливает анимации, но таймеры продолжают идти: цепочка исправно
     заводила новые шарики, а старые не могли долететь и убраться — событие
     окончания анимации не приходило. Через пару минут на другой вкладке
     накапливался десяток, и все они разом стартовали снизу при
     возвращении. Теперь в скрытой вкладке цепочка встаёт на паузу. */
  const pending = useRef<Side | null>(null);

  /** Запускает шарик с указанной стороны и планирует следующий с другой. */
  const launch = useCallback(
    (side: Side) => {
      const sources = side === "left" ? left : right;
      if (!sources.length) return;

      // Вкладку не смотрят — придержим до возвращения
      if (document.hidden) {
        pending.current = side;
        return;
      }

      const dur = rnd(11, 17);
      const flight: Flight = {
        id: nextId.current++,
        side,
        dur,
        /* Сдвиг в ПРОЦЕНТАХ от ширины шарика, а не в пикселях, и только
           внутрь поля — в сторону контента.

           В пикселях выходило плохо в обе стороны: сдвиг наружу выпихивал
           шарик за кромку экрана (замерено: на 1440px правый обрезался на
           13px), а фиксированное число пикселей на широком мониторе было
           незаметным, на узком — чрезмерным. Проценты масштабируются
           вместе с шариком, а вместе с потолком ширины 0.85 поля дают
           сумму меньше единицы: на фотографии он не заедет никогда. */
        dx: rnd(0, 10),
        /* Разброс размеров поджат: при 0.78 самый мелкий шарик терялся,
           а вся полезная ширина поля так и оставалась незанятой. */
        scale: rnd(0.88, 1.06),
        sway: rnd(2.6, 4.4),
        src: sources[Math.floor(Math.random() * sources.length)],
        popped: false,
      };

      // Страховка на случай, если вкладку скрыли ровно между проверкой и
      // отрисовкой: лишний шарик просто не добавляем.
      setFlights((f) => (f.length >= MAX_ON_SCREEN ? f : [...f, flight]));

      /* СЕРЕДИНА ЭКРАНА — половина пролёта. Отсюда отсчитываем паузу до
         вылета с другой стороны: так на экране почти всегда ровно один
         шарик, а второй появляется как ответ на первый. */
      later(
        () => launch(side === "left" ? "right" : "left"),
        (dur / 2) * 1000 + rnd(GAP_MIN, GAP_MAX),
      );
    },
    [left, right, later],
  );

  // Первый шарик — справа, после короткой паузы на прогрузку
  useEffect(() => {
    if (calm) return;
    later(() => launch("right"), rnd(1200, 3500));

    /* Вернулись на вкладку — снимаем с паузы. Задержка случайная и
       заметная: иначе шарик выпрыгивал бы ровно в момент переключения и
       читался как реакция на него. */
    const wake = () => {
      if (document.hidden || !pending.current) return;
      const side = pending.current;
      pending.current = null;
      later(() => launch(side), rnd(800, 3000));
    };
    document.addEventListener("visibilitychange", wake);

    const list = timers.current;
    return () => {
      document.removeEventListener("visibilitychange", wake);
      list.forEach(window.clearTimeout);
      list.length = 0;
    };
  }, [calm, launch, later]);

  const pop = (id: number) => {
    setFlights((f) => f.map((x) => (x.id === id ? { ...x, popped: true } : x)));
    // Осколкам даём разлететься, потом убираем шарик из разметки
    later(() => setFlights((f) => f.filter((x) => x.id !== id)), 700);
  };

  const done = (id: number) =>
    setFlights((f) => f.filter((x) => x.id !== id));

  if (calm) return null;

  return (
    <>
      {flights.map((f) => {
        const width = `calc(${WIDTH} * ${f.scale.toFixed(3)})`;
        return (
          /* fixed, а не absolute: шарик плывёт в поле ЭКРАНА, пока листаешь
             страницу. Явная ширина обязательна — без неё у fixed-обёртки
             ширина нулевая, а Tailwind вешает на картинки max-width:100%,
             то есть 100% от нуля, и шарик схлопывается в точку.

             Порог 1420px, а не брейкпоинт 2xl (1536): на 2xl пасхалку не
             видел никто с обычным ноутбуком — именно из-за этого шарики и
             «пропали» с Ленты. */
          <div
            key={f.id}
            /* 1420px записан строкой, а не переменной: Tailwind собирает
               классы, читая исходник глазами, и вычисленное имя не найдёт. */
            className={`pointer-events-none fixed inset-y-0 z-20 hidden min-[1420px]:block ${
              f.side === "left" ? "left-1" : "right-1"
            }`}
            style={{
              width,
              // Внутрь поля: слева это вправо, справа — влево
              transform: `translateX(${f.side === "left" ? f.dx : -f.dx}%)`,
            }}
          >
            <div
              className="absolute bottom-0 w-full"
              style={{
                animation: `balloon-fly ${f.dur}s linear forwards`,
                willChange: "transform",
              }}
              // Долетел до верха и его не лопнули — убираем
              onAnimationEnd={() => done(f.id)}
            >
              <div
                style={{
                  animation: `balloon-sway ${f.sway}s ease-in-out infinite`,
                }}
              >
                {!f.popped ? (
                  <button
                    type="button"
                    onClick={() => pop(f.id)}
                    aria-label="Лопнуть шарик"
                    title="Лопни меня"
                    className="pointer-events-auto block w-full cursor-pointer border-0 bg-transparent p-0 transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#6B4E81] focus-visible:outline-none"
                  >
                    {/* НЕ lazy: шарик стартует за нижней кромкой, и ленивая
                        загрузка для него не срабатывает — картинка не
                        грузится, кнопка остаётся 0×0 и пасхалки не видно.

                        width/height — только пропорции кадра: реальную
                        ширину задаёт обёртка, а эти числа не дают строке
                        дёрнуться, пока картинка грузится. */}
                    <img
                      src={f.src}
                      alt=""
                      width={100}
                      height={137}
                      decoding="async"
                      className="h-auto w-full opacity-90 drop-shadow-[0_14px_26px_rgba(45,36,56,0.18)]"
                    />
                  </button>
                ) : (
                  <div className="relative aspect-square w-full">
                    {/* Сам шарик коротко раздувается и гаснет */}
                    <img
                      src={f.src}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full"
                      style={{
                        animation: "balloon-burst 260ms ease-out forwards",
                      }}
                    />
                    {SHARDS.map((s, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className="absolute top-1/2 left-1/2 h-2.5 w-2.5 rounded-full"
                        style={
                          {
                            backgroundColor: s.c,
                            "--dx": s.dx,
                            "--dy": s.dy,
                            animation: `shard-fly 620ms cubic-bezier(0.22,1,0.36,1) ${i * 12}ms forwards`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
