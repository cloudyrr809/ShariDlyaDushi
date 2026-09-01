import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CoverHeader } from "./components/ui/PageHeader";
import { SkyBackdrop } from "./components/ui/SkyBackdrop";
import { PopBalloons } from "./components/ui/PopBalloon";
import { Lightbox } from "./components/ui/Lightbox";
import { Collage } from "./components/ui/PhotoCollage";
import {
  demoPosts,
  fetchPosts,
  isRenderablePost,
  type Post,
} from "./lib/feed";
import { isConfigured } from "./lib/supabase";

/* ─────────────────────────────────────────────────────────────────────────
   ЛЕНТА СТУДИИ

   Заменяет две прежние страницы — «Фотопроекты» и «Наши работы», обе были
   заглушками «раздел в разработке».

   Пост — это ФОТО, ТЕКСТ и ДАТА. Ни лайков, ни комментариев, ни хештегов:
   на сайте студии счётчики читались бы как имитация активности.

   У каждой фотографии ОБЯЗАТЕЛЬНО указаны настоящие w и h. На них держится
   вся раскладка: без реальных пропорций пришлось бы либо резать кадры, либо
   оставлять дыры. Админка снимает их при загрузке снимка.

   ДАННЫЕ ПРИХОДЯТ ИЗ БАЗЫ (см. lib/feed.ts). Пока база не подключена,
   страница живёт показательными постами из кода — пустая «Лента» выглядела
   бы как сломанный раздел.
   ───────────────────────────────────────────────────────────────────────── */
const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «2026-07-16» → «16 июля 2026». Свой форматтер, а не toLocaleDateString:
    тот отдаёт «16 июл. 2026 г.» с точками и «г.» — канцелярски.

    Пустую или кривую дату (из админки могло прийти незаполненное поле)
    отдаём как пустую строку, а не «NaN undefined» — пост не должен
    ломаться из-за одного поля. */
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return "";
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** Мета-строка: дата — первый из трёх уровней набора поста. */
function Meta({ post }: { post: Post }) {
  const date = formatDate(post.date);
  if (!date) return null;
  return (
    <div className="text-sm font-semibold tracking-widest text-[#A64D6C] uppercase">
      {/* dateTime — машиночитаемая дата: по ней пост понимают поиск и
          читалки, а видимая строка набрана по-русски. */}
      <time dateTime={post.date}>{date}</time>
    </div>
  );
}

/* ─────────────────────────── ПОСТ ───────────────────────────
   Редакционная подача: ни белой подложки, ни тени — фотографии и текст
   лежат прямо на фоне страницы, посты разделяет воздух. Белый
   прямоугольник с тенью читается как элемент интерфейса, а не как
   разворот журнала. */
function PostCard({
  post,
  onOpen,
}: {
  post: Post;
  onOpen: (post: Post, i: number) => void;
}) {
  return (
    /* ДВЕ КОЛОНКИ НА ШИРОКОМ ЭКРАНЕ: коллаж слева, текст справа.

       Раньше текст лежал ПОД фотографиями и добавлял к посту ещё ~210px —
       пост переставал помещаться в экран. Сбоку он высоту не добавляет, а
       заодно занимает пустое поле, которое иначе пустовало бы справа.

       Ниже lg порядок прежний: снимки сверху, текст под ними (на 768px
       колонка сбоку вышла бы уже 30 знаков в строке — не читается).

       --collage-w — потолок ширины коллажа в долях строки. Меньше на lg,
       где рядом ещё колонка текста и всё вместе должно уместиться. */
    <article className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-10 lg:[--collage-w:56%] xl:[--collage-w:62%]">
      <Collage photos={post.photos} onOpen={(i) => onOpen(post, i)} />

      {/* ТЕКСТОВАЯ КОЛОНКА.

          flex-1 — колонка тянется до правого края строки, поэтому отступ
          справа от поста равен отступу слева (раньше справа зияло до 400px).
          max-w-[42rem] держит длину строки читаемой на самых узких
          коллажах; min-w-0 нужен flex-детям с overflow внутри.

          lg:max-h / flex-col / overflow — текст, который длиннее коллажа,
          прокручивается ВНУТРИ своей высоты, а не утягивает пост вниз.
          Ссылка «Собрать такую же» вынесена из прокрутки и закреплена
          снизу — её видно сразу, не долистывая. */}
      <div className="flex min-w-0 flex-1 flex-col max-w-[34rem] lg:max-w-[42rem] lg:max-h-[62vh]">
        {/* Затухание у нижней кромки — знак, что текст продолжается за
            прокруткой. Только на lg: ниже текст не в прокрутке, и маска
            съедала бы последнюю строку. */}
        <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-3 lg:[-webkit-mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)] lg:[mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]">
          <Meta post={post} />

          {post.title && (
            <h3 className="mt-4 text-[1.55rem] leading-snug font-semibold tracking-[-0.01em] text-[#2D2433]">
              {post.title}
            </h3>
          )}

          {/* whitespace-pre-line — в текстах бывают переносы и пустые
              строки между абзацами, они должны сохраняться. */}
          {post.text && (
            <p className="mt-3 text-[17px] leading-relaxed font-medium whitespace-pre-line text-[#5A4D66]">
              {post.text}
            </p>
          )}
        </div>

        {/* Ссылка, а не кнопка: кнопка в спокойной ленте читается как
            реклама. shrink-0 — не сжимается прокруткой выше, всегда видна. */}
        <Link
          to="/catalog"
          className="group mt-6 inline-flex shrink-0 items-center gap-2 self-start text-base font-semibold text-[#6B4E81] transition-colors hover:text-[#513A6B] lg:border-t lg:border-[#E8DEEE]/70 lg:pt-4"
        >
          Собрать такую же
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}

/* ─────────────────────── ЗАГЛУШКА НА ВРЕМЯ ЗАГРУЗКИ ───────────────────────

   Посты приезжают из базы уже после того, как страница отрисовалась, и
   первую секунду лента стояла пустой — это читалось как поломка, а не как
   ожидание. Серые блоки той же формы, что настоящий пост, честно говорят
   «сейчас будет»: глаз видит, что раздел не пустой, а грузится.

   aria-hidden — для читалок это шум; о состоянии им скажет aria-busy на
   самой секции. */
function PostSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex animate-pulse flex-col gap-7 lg:flex-row lg:items-start lg:gap-10"
    >
      <div className="h-[46vh] w-full rounded-[1.5rem] bg-[#E5D8EE] lg:h-[62vh] lg:w-[56%] xl:w-[62%]" />
      <div className="flex-1 space-y-4 pt-1">
        <div className="h-4 w-44 rounded bg-[#E5D8EE]" />
        <div className="h-7 w-3/4 rounded bg-[#E5D8EE]" />
        <div className="space-y-2.5 pt-2">
          <div className="h-4 w-full rounded bg-[#E5D8EE]" />
          <div className="h-4 w-11/12 rounded bg-[#E5D8EE]" />
          <div className="h-4 w-4/5 rounded bg-[#E5D8EE]" />
        </div>
      </div>
    </article>
  );
}

/** По сколько постов показывать за раз.

    Лента редакционная, посты высокие: пять штук — это уже шесть экранов
    прокрутки. Без порций страница с двумя десятками постов грузила бы
    сразу все фотографии и открывалась заметно дольше. */
const BATCH = 4;

export default function Feed() {
  // Какой пост открыт в просмотрщике и на какой фотографии
  const [view, setView] = useState<{ post: Post; i: number } | null>(null);
  const [shown, setShown] = useState(BATCH);

  /* null — ещё читаем из базы. Когда база не подключена, читать нечего и
     сразу берём показательные посты из кода. */
  const [posts, setPosts] = useState<Post[] | null>(
    isConfigured ? null : demoPosts,
  );

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    fetchPosts()
      .then((p) => {
        if (alive && p) setPosts(p);
      })
      /* Обрыв связи не должен оставлять пустой раздел: показываем
         образцовые посты, а не белое поле с кнопкой. */
      .catch(() => {
        if (alive) setPosts(demoPosts);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* Отсеиваем посты без фотографий ДО показа: пост без кадра нечего
     показывать в витрине, а раньше он вдобавок ронял раскладку коллажа и
     с ним всю страницу. Так недозаполненный пост из админки просто не
     появляется, а не «ломает сайт». */
  const renderable = posts?.filter(isRenderablePost) ?? null;
  const visible = renderable?.slice(0, shown) ?? [];
  const left = (renderable?.length ?? 0) - shown;

  return (
    <div className="relative overflow-x-clip bg-[#FDFBFD] text-[#2D2433]">
      <SkyBackdrop />

      {/* Пасхалка в пустом поле по бокам ленты. Ниже xl поля нет —
          компонент там сам себя скрывает. Шарики идут по очереди:
          справа → слева → справа, каждый следующий после того, как
          предыдущий прошёл середину экрана. */}
      <PopBalloons
        left={["/assets/ballon2.png", "/assets/ballon4.png"]}
        right={["/assets/ballon6.png", "/assets/ballon3.png"]}
      />

      <CoverHeader
        eyebrow="жизнь студии"
        title="Лента"
        lead="Композиции и съёмки студии. Показываем, что и как мы делаем — без глянца и постановки."
      />

      {/* ЛЕНТА.
          Одна колонка, а не сетка: посты разной высоты, в две колонки они
          разъезжались бы рваными хвостами. */}
      <section
        aria-label="Публикации студии"
        aria-busy={renderable === null}
        className="relative z-10 mx-auto w-full max-w-[79rem] px-6 pb-20 md:pb-28"
      >
        {renderable !== null && renderable.length === 0 && (
          <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
            Здесь скоро появятся наши работы.
          </p>
        )}

        <div className="flex flex-col gap-16 md:gap-20">
          {renderable === null ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : (
            visible.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onOpen={(p, i) => setView({ post: p, i })}
              />
            ))
          )}
        </div>

        {/* Кнопка, а не бесконечная прокрутка: у бесконечной ленты
            недостижим подвал с контактами, а он тут единственный способ
            связаться. */}
        {left > 0 && (
          <div className="mt-16 text-center md:mt-20">
            <button
              type="button"
              onClick={() => setShown((n) => n + BATCH)}
              className="cursor-pointer rounded-xl border border-[#E8DEEE] bg-white/80 px-8 py-4 text-base font-semibold text-[#6B4E81] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_30px_-10px_rgba(107,78,129,0.4)]"
            >
              Показать ещё
            </button>
          </div>
        )}
      </section>

      <Lightbox
        shots={view?.post.photos ?? []}
        index={view ? view.i : null}
        title={view?.post.title}
        onClose={() => setView(null)}
        onIndex={(i) => setView((v) => (v ? { ...v, i } : v))}
      />
    </div>
  );
}
