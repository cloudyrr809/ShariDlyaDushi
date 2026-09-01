/* ────────────────────────── ЗАКАЗ ЧЕРЕЗ ВКОНТАКТЕ ──────────────────────────

   ПОЧЕМУ НЕ ФОРМА С ИМЕНЕМ И ТЕЛЕФОНОМ.

   Раньше корзина собирала имя и телефон и отправляла их в телеграм-бота,
   токен которого лежал прямо в коде сайта — то есть был доступен любому.
   Заодно это делало студию оператором персональных данных со всеми
   вытекающими: согласие, политика, уведомление в Роскомнадзор, хранение
   данных на территории России.

   Теперь сайт НЕ СОБИРАЕТ И НЕ ПЕРЕДАЁТ НИЧЕГО. Он складывает состав
   заказа в буфер обмена и открывает диалог со студией во ВКонтакте.
   Дальше человек сам вставляет текст и отправляет — ровно так же, как
   если бы написал сам. Данные не покидают его браузер: ни на наш сервер,
   ни на чужой они не уходят.

   Для студии ничего не меняется к худшему: заявка приходит туда, где Нина
   и так работает, а вместе с ней виден профиль отправителя. */

/** Короткое имя сообщества во ВКонтакте. */
export const VK_NAME = "sharydlyadushi";

/** Страница сообщества — для обычных ссылок «мы во ВКонтакте». */
export const VK_PAGE = `https://vk.com/${VK_NAME}`;

/** Прямой переход в диалог с сообществом. */
export const VK_CHAT = `https://vk.me/${VK_NAME}`;

export type OrderLine = { title: string; quantity: number; price: number };

/** Собирает текст заявки. Никуда не отправляется — только в буфер. */
export function buildOrderText(lines: OrderLine[], note: string): string {
  const parts = ["Здравствуйте! Хочу заказать с сайта:", ""];

  lines.forEach((l, i) => {
    parts.push(`${i + 1}. ${l.title} — ${l.quantity} шт. × ${l.price} ₽`);
  });

  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  parts.push("", `Примерная сумма: ${total} ₽`);

  if (note.trim()) parts.push("", `Пожелания: ${note.trim()}`);

  return parts.join("\n");
}

/**
 * Кладёт текст в буфер обмена.
 *
 * Возвращает false, если браузер не дал — тогда интерфейс показывает текст
 * и просит скопировать вручную. Тихо терять заявку нельзя.
 *
 * navigator.clipboard работает только на https и на localhost; запасной
 * путь через скрытое поле и execCommand выручает на старых браузерах.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // разрешение не дали — пробуем запасной путь
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** Открывает диалог со студией во ВКонтакте в новой вкладке. */
export function openVkChat(): void {
  window.open(VK_CHAT, "_blank", "noopener,noreferrer");
}
