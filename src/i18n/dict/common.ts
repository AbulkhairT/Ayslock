import type { Locale } from "../config";

const en = {
  tagline: "Find your person. Pick a time. You're booked.",
  skipToContent: "Skip to content",
  logoLabel: "Ayslock home",
  signIn: "Sign in",
  logIn: "Log in",
  logOut: "Log out",
  createProfile: "Create your profile",
  back: "Back",
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  copyLink: "Copy link",
  copied: "Copied",
  copyPrompt: "Copy this link:",
  somethingWrong: "Something went wrong. Please try again.",
  optional: "optional",
  demo: {
    label: "Demo mode:",
    simulatedSignIn: "sign-in is simulated",
    previewedEmail: "emails are previewed, not sent",
    ephemeral: "no database is connected, so bookings and sign-ins may not stick",
    localFile: "data lives in a local database file",
    outbox: "Notification preview",
  },
  noDatabase: {
    title: "This site isn't connected to a database yet.",
    body: "Each server copy keeps its own temporary data, so pages can lose what you just did.",
  },
  mode: { open: "Books instantly", approval: "Approves each booking", private: "Invite only" },
  location: {
    online: (details: string) => `Online: ${details}`,
    onlineTbd: "Online (details from your provider)",
    inPersonTbd: "Location from your provider",
  },
  notFound: {
    title: "We couldn't find that page",
    body: "The link may be mistyped, or the page was removed.",
    home: "Go to the home page",
  },
};

const ru: typeof en = {
  tagline: "Найдите своего мастера. Выберите время. Готово.",
  skipToContent: "Перейти к содержанию",
  logoLabel: "Ayslock, главная",
  signIn: "Войти",
  logIn: "Войти",
  logOut: "Выйти",
  createProfile: "Создать профиль",
  back: "Назад",
  save: "Сохранить",
  cancel: "Отмена",
  close: "Закрыть",
  copyLink: "Скопировать ссылку",
  copied: "Скопировано",
  copyPrompt: "Скопируйте ссылку:",
  somethingWrong: "Что-то пошло не так. Попробуйте ещё раз.",
  optional: "необязательно",
  demo: {
    label: "Демо-режим:",
    simulatedSignIn: "вход имитируется",
    previewedEmail: "письма не отправляются, а показываются на сайте",
    ephemeral: "база данных не подключена, поэтому записи и входы могут пропадать",
    localFile: "данные хранятся в локальном файле",
    outbox: "Посмотреть письма",
  },
  noDatabase: {
    title: "Сайт пока не подключён к базе данных.",
    body: "Каждая копия сервера хранит свои временные данные, поэтому страницы могут терять только что сделанное.",
  },
  mode: { open: "Запись сразу", approval: "Подтверждает каждую запись", private: "Только по приглашению" },
  location: {
    online: (details: string) => `Онлайн: ${details}`,
    onlineTbd: "Онлайн (детали сообщит специалист)",
    inPersonTbd: "Адрес сообщит специалист",
  },
  notFound: {
    title: "Такой страницы нет",
    body: "Возможно, в ссылке опечатка или страницу удалили.",
    home: "На главную",
  },
};

export const common = { en, ru } satisfies Record<Locale, typeof en>;
