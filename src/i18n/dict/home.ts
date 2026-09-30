import type { Locale } from "../config";
import { plural } from "../plural";

const en = {
  heading: "Who are you booking with?",
  sub: "Find them, pick a time, done. No account or app needed.",
  justLooking: "Just looking? Try",
  or: "or",
  offerService: "Offer a service?",
  howTitle: "How booking works",
  search: {
    label: "Enter a name or @username",
    placeholder: "Name or @username",
    button: "Search",
    searching: "Searching…",
    unavailable: "Search isn't working right now. If you have their link, open it directly.",
    tooShort: "Type at least two letters of their name or @username.",
    noOne: (q: string) => `No one found for “${q}”.`,
    checkHandle: (handle: string) => `Check the spelling of @${handle} with them, or ask for their booking link.`,
    checkSpelling: "Check the spelling, or ask them for their booking link.",
    exactOnly: "Some people can only be found by their exact @username.",
    results: (n: number) => (n === 1 ? "1 result" : `${n} results`),
    resultsLabel: "Search results",
  },
  demo: {
    steps: [
      { title: "Find them", body: "Search their name or @username, or open the link they sent you." },
      { title: "Choose a service", body: "Length and price are shown up front." },
      { title: "Pick a time", body: "Only real free times, shown in your own timezone." },
      { title: "You're booked", body: "A confirmation by email, with a link to change or cancel." },
    ],
    profession: "Barber",
    services: ["Haircut", "Beard trim", "Cut and beard"],
    booked: "You're booked",
    with: "With",
    when: "When",
    where: "Where",
    address: "48 Orchard Lane, Brooklyn",
    footer: "Add to calendar · Change or cancel",
    pause: "Pause",
    play: "Play walkthrough",
    figure: (n: number, total: number, title: string) => `Step ${n} of ${total}: ${title}`,
  },
};

const ru: typeof en = {
  heading: "К кому вы записываетесь?",
  sub: "Найдите специалиста, выберите время — и готово. Без аккаунта и приложений.",
  justLooking: "Просто смотрите? Попробуйте",
  or: "или",
  offerService: "Оказываете услуги?",
  howTitle: "Как проходит запись",
  search: {
    label: "Введите имя или @username",
    placeholder: "Имя или @username",
    button: "Найти",
    searching: "Ищем…",
    unavailable: "Поиск сейчас не работает. Если у вас есть ссылка специалиста, откройте её.",
    tooShort: "Введите хотя бы две буквы имени или @username.",
    noOne: (q: string) => `Никого не нашли по запросу «${q}».`,
    checkHandle: (handle: string) => `Уточните у специалиста, верно ли написано @${handle}, или попросите ссылку для записи.`,
    checkSpelling: "Проверьте написание или попросите у специалиста ссылку для записи.",
    exactOnly: "Некоторых специалистов можно найти только по точному @username.",
    results: (n: number) =>
      `${plural("ru", n, { one: "Найден", few: "Найдено", many: "Найдено", other: "Найдено" })} ${n} ${plural("ru", n, { one: "специалист", few: "специалиста", many: "специалистов", other: "специалиста" })}`,
    resultsLabel: "Результаты поиска",
  },
  demo: {
    steps: [
      { title: "Найдите специалиста", body: "Введите имя или @username или откройте ссылку, которую вам прислали." },
      { title: "Выберите услугу", body: "Длительность и цена видны сразу." },
      { title: "Выберите время", body: "Только действительно свободное время — в вашем часовом поясе." },
      { title: "Вы записаны", body: "Подтверждение придёт на почту, со ссылкой, чтобы перенести или отменить запись." },
    ],
    profession: "Барбер",
    services: ["Стрижка", "Стрижка бороды", "Стрижка и борода"],
    booked: "Вы записаны",
    with: "Специалист",
    when: "Когда",
    where: "Где",
    address: "48 Orchard Lane, Бруклин",
    footer: "Добавить в календарь · Перенести или отменить",
    pause: "Пауза",
    play: "Показать по шагам",
    figure: (n: number, total: number, title: string) => `Шаг ${n} из ${total}: ${title}`,
  },
};

export const home = { en, ru } satisfies Record<Locale, typeof en>;
