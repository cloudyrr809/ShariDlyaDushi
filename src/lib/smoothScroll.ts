import Lenis from "lenis";

/* ──────────────────────── ПЛАВНАЯ ПРОКРУТКА ────────────────────────

   Тот же «тягучий» скролл, что на augen.pro. Там он сделан на библиотеке
   Lenis — она перехватывает колесо мыши и трекпад и доводит страницу до
   новой позиции по инерции, вместо резкого шага браузера. Разметку это
   не трогает: просто плавнее едет.

   Настройки — как у augen: длительность добега 1.2 c и та же кривая
   замедления (expo-out). Тачскрин оставляем РОДНОЙ прокрутке
   (syncTouch: false) — на телефоне инерция уже своя, а перехват там
   только добавляет рывков.

   Экземпляр держим на уровне модуля: до него дотягивается ScrollToTop в
   main.tsx, чтобы переход между страницами и прыжок к якорю шли через ту
   же самую прокрутку, а не спорили с ней. */

let instance: Lenis | null = null;

/** Текущий экземпляр Lenis или null, пока плавная прокрутка не запущена
    (не запускается при системной настройке «меньше движения»). */
export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Замораживает плавную прокрутку, пока открыт оверлей, и возвращает
 * функцию возобновления.
 *
 * Одного `body { overflow: hidden }` мало: Lenis двигает страницу сам и
 * про запрет на теле не знает — под открытым окном фон продолжал бы
 * ехать. Зовём рядом с той же блокировкой прокрутки, а возобновление
 * отдаём в cleanup эффекта.
 */
export function pauseSmoothScroll(): () => void {
  const lenis = instance;
  if (!lenis) return () => {};
  lenis.stop();
  return () => lenis.start();
}

/** Запускает плавную прокрутку и цикл кадров. Возвращает функцию
    остановки — её отдаём из useEffect как cleanup. */
export function startSmoothScroll(): () => void {
  if (typeof window === "undefined") return () => {};

  // «Меньше движения» — уважаем так же, как в Hero и счётчиках: оставляем
  // родную мгновенную прокрутку.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  if (instance) return () => {};

  instance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.5,
  });

  let raf = 0;
  const loop = (time: number) => {
    instance?.raf(time);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    instance?.destroy();
    instance = null;
  };
}
