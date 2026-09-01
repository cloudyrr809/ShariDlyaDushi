import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CoverHeader } from "./components/ui/PageHeader";
import { SkyBackdrop } from "./components/ui/SkyBackdrop";
import { PopBalloon } from "./components/ui/PopBalloon";
import { Lightbox } from "./components/ui/Lightbox";
import { Collage } from "./components/ui/PhotoCollage";
import { demoPosts, fetchPosts, type Post } from "./lib/feed";
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
    тот отдаёт «16 июл. 2026 г.» с точками и «г.» — канцелярски. */
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Мета-строка: дата и тип поста — первый из трёх уровней набора. */
function Meta({ post }: { post: Post }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-semibold tracking-widest uppercase">
      {/* dateTime — машиночитаемая дата: по ней пост понимают поиск и
          читалки, а видимая строка набрана по-русски. */}
      <time dateTime={post.date} className="text-[#A64D6C]">
        {formatDate(post.date)}
      </time>
      <span aria-hidden="true" className="text-[#C9B4D6]">
        ·
      </span>
      <span className="text-[#6B4E81]">{post.kind}</span>
    </div>
  );
}

/* ─────────────────────────── ПОСТ ───────────────────────────
   Редакционная подача: ни белой подложки, ни тени — фотографии и текст
   лежат прямо на фоне страницы, посты разделяет воздух. Белый
   прямоугольник с тенью читается как элемент интерфейса, а не как
   разворот журнала.

   Текст сужен относительно снимков: строка во всю ширину колонки
   читается тяжело, а узкий столбец под широкой фотографией — обычный
   приём вёрстки. */
function PostCard({
  post,
  onOpen,
}: {
  post: Post;
  onOpen: (post: Post, i: number) => void;
}) {
  return (
    /* ДВЕ КОЛОНКИ НА ШИРОКОМ ЭКРАНЕ: коллаж слева, текст справа.

       Раньше текст лежал ПОД фотографиями и добавлял к посту ещё ~210px.
       Вместе с неограниченным коллажом пост доходил до 1390px — чтобы
       рассмотреть его целиком, приходилось листать, и к низу снимка
       заголовок уже уезжал за верхнюю кромку. Заодно по бокам ленты
       (колонка была 52rem против 79rem у шапки) пустовало по 216px.

       Перенос текста вбок решает обе беды одним движением: пост теряет
       двести с лишним пикселей высоты, а пустые поля занимает текст.

       Разделение начинается с lg, а не с md: на 768px правая колонка
       вышла бы 235px — это ~30 знаков в строке, читать невозможно.
       Ниже lg порядок прежний: снимки сверху, текст под ними. */
    /* Не сетка, а flex. У сетки колонки фиксированные, а ширина коллажа у
       каждого поста своя (от 372 до 800px) — текст стоял бы на месте, и
       зазор между ним и фотографиями гулял бы от 48 до 350px. Во flex
       текст встаёт сразу за коллажем: зазор всегда один, а разница уходит
       в правое поле страницы, где её не видно.

       --collage-w — потолок ширины коллажа. Он разный по брейкпоинтам,
       иначе на 1024px коллаж и текст вместе не помещались бы в строку. */
    <article className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-12 lg:[--collage-w:52%] xl:[--collage-w:60%]">
      <Collage photos={post.photos} onOpen={(i) => onOpen(post, i)} />

      {/* max-w-[34rem] нужен в одноколоночном режиме: там строка иначе
          растянулась бы на всю ширину ленты. */}
      <div className="max-w-[34rem] lg:w-[20rem] lg:shrink-0 xl:w-[24rem]">
        <Meta post={post} />

        <h3 className="mt-4 text-[1.55rem] leading-snug font-semibold tracking-[-0.01em] text-[#2D2433]">
          {post.title}
        </h3>

        {/* whitespace-pre-line — в текстах бывают переносы и пустые
            строки между абзацами, они должны сохраняться. */}
        <p className="mt-3 text-[17px] leading-relaxed font-medium whitespace-pre-line text-[#5A4D66]">
          {post.text}
        </p>

        {/* Ссылка, а не кнопка: кнопка в спокойной ленте читается как
            реклама. До этого на странице не было ни одной ссылки —
            человек смотрел работы и не мог никуда перейти. */}
        <Link
          to="/catalog"
          className="group mt-6 inline-flex items-center gap-2 text-base font-semibold text-[#6B4E81] transition-colors hover:text-[#513A6B]"
        >
          Собрать такую же
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
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

  const visible = posts?.slice(0, shown) ?? [];
  const left = (posts?.length ?? 0) - shown;

  return (
    <div className="relative overflow-x-clip bg-[#FDFBFD] text-[#2D2433]">
      <SkyBackdrop />

      {/* Пасхалка в пустом поле по бокам ленты. Ниже xl поля нет —
          компонент там сам себя скрывает. */}
      <PopBalloon
        side="left"
        sources={["/assets/ballon2.png", "/assets/ballon4.png"]}
      />
      <PopBalloon
        side="right"
        sources={["/assets/ballon6.png", "/assets/ballon3.png"]}
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
        className="relative z-10 mx-auto w-full max-w-[79rem] px-6 pb-20 md:pb-28"
      >
        {posts !== null && posts.length === 0 && (
          <p className="text-[17px] leading-relaxed font-medium text-[#5A4D66]">
            Здесь скоро появятся наши работы.
          </p>
        )}

        <div className="flex flex-col gap-16 md:gap-20">
          {visible.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpen={(p, i) => setView({ post: p, i })}
            />
          ))}
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
