import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Пасхалка: шарик вылетает снизу, пересекает экран и уходит за верхний
 * край. По клику лопается. Живёт в пустом поле сбоку от ленты, поэтому
 * ничего не загораживает, и скрыт ниже 2xl — там этого поля нет.
 *
 * Каждый вылет СЛУЧАЕН: своя скорость, свой сдвиг вбок, свой размер,
 * свой шарик и своя пауза до следующего. Раньше параметры были жёстко
 * заданы, оба шарика ходили по расписанию, а пауза была встроена в кадры
 * анимации — из-за чего шарик подолгу стоял под кромкой экрана, и это
 * читалось как зависание. Теперь в паузе его просто нет в разметке.
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

type Flight = {
  id: number;
  /** секунд на пролёт */
  dur: number;
  /** сдвиг вбок от края поля, px */
  dx: number;
  /** масштаб шарика */
  scale: number;
  /** период покачивания, с */
  sway: number;
  src: string;
};

export function PopBalloon({
  side,
  sources,
}: {
  side: "left" | "right";
  /** из этого набора каждый вылет выбирает шарик случайно */
  sources: string[];
}) {
  const [flight, setFlight] = useState<Flight | null>(null);
  const [popped, setPopped] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const launch = useCallback(() => {
    setPopped(false);
    setFlight({
      id: Math.random(),
      dur: rnd(9, 15),
      /* Сдвиг только к краю экрана, а не вглубь страницы: при разбеге до
         +40px шарик заходил на контент. Знак задаёт сторона. */
      dx: (side === "left" ? -1 : 1) * rnd(-8, 26),
      scale: rnd(0.72, 1.08),
      sway: rnd(2.6, 4.4),
      src: sources[Math.floor(Math.random() * sources.length)],
    });
  }, [sources, side]);

  /** Убрать шарик и назначить следующий вылет через случайную паузу */
  const rest = useCallback(() => {
    setFlight(null);
    setPopped(false);
    timer.current = window.setTimeout(launch, rnd(2500, 9000));
  }, [launch]);

  /* Системная настройка «меньше движения»: пасхалку просто не показываем.
     Гасить анимацию нельзя — компонент ждёт событие её окончания, чтобы
     назначить следующий вылет, и шарик застрял бы за нижней кромкой. */
  const [calm] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  // Первый вылет — тоже через случайную задержку, чтобы два шарика на
  // странице не стартовали синхронно
  useEffect(() => {
    if (calm) return;
    timer.current = window.setTimeout(launch, rnd(1, 7) * 1000);
    return () => window.clearTimeout(timer.current);
  }, [launch, calm]);

  /** Хлопок: даём осколкам разлететься и уходим в паузу */
  const pop = useCallback(() => {
    if (!flight || popped) return;
    setPopped(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(rest, 700);
  }, [flight, popped, rest]);

  if (calm || !flight) return null;

  const size = Math.round(86 * flight.scale);

  return (
    /* fixed, а не absolute: шарик плывёт в поле ЭКРАНА, пока листаешь
       ленту. Явная ширина обязательна — без неё у fixed-обёртки ширина
       нулевая, а Tailwind вешает на картинки max-width:100%, то есть
       100% от нуля, и шарик схлопывается в точку. */
    <div
      /* 2xl, а не xl. Поле сбоку есть только там: контент сайта — 79rem
         (1264px), и на 1280px до края остаётся 8px, то есть шарик летел
         бы прямо по фотографиям. На 1536px поле уже 136px — свободно. */
      className={`pointer-events-none fixed inset-y-0 z-20 hidden 2xl:block ${
        side === "left" ? "left-[2%]" : "right-[2%]"
      }`}
      style={{ width: size, transform: `translateX(${flight.dx}px)` }}
    >
      <div
        key={flight.id}
        className="absolute bottom-0"
        style={{
          width: size,
          animation: `balloon-fly ${flight.dur}s linear forwards`,
          willChange: "transform",
        }}
        // Долетел до верха и его не лопнули — уходим в паузу
        onAnimationEnd={rest}
      >
        <div
          style={{
            animation: `balloon-sway ${flight.sway}s ease-in-out infinite`,
          }}
        >
          {!popped ? (
            <button
              type="button"
              onClick={pop}
              aria-label="Лопнуть шарик"
              title="Лопни меня"
              style={{ width: size }}
              className="pointer-events-auto block cursor-pointer border-0 bg-transparent p-0 transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#6B4E81] focus-visible:outline-none"
            >
              {/* НЕ lazy: шарик стартует за нижней кромкой, и ленивая
                  загрузка для него не срабатывает — картинка не грузится,
                  кнопка остаётся 0×0 и пасхалка просто не видна. */}
              <img
                src={flight.src}
                alt=""
                width={size}
                height={Math.round(size * 1.37)}
                decoding="async"
                className="w-full opacity-90 drop-shadow-[0_14px_26px_rgba(45,36,56,0.18)]"
              />
            </button>
          ) : (
            <div className="relative" style={{ width: size, height: size }}>
              {/* Сам шарик коротко раздувается и гаснет */}
              <img
                src={flight.src}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full"
                style={{ animation: "balloon-burst 260ms ease-out forwards" }}
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
}
