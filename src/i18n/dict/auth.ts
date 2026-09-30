import type { Locale } from "../config";

const en = {
  email: "Email",
  password: "Password",
  passwordHint: "At least 8 characters.",
  pending: "One moment…",
  confirmSent: (email: string) => `We sent a link to ${email}. Open it on this device to confirm your account and finish setting up.`,
  signIn: {
    metaTitle: "Log in · Ayslock",
    noDatabase: "Sign-ins can drop out right after you log in.",
    title: "Log in to your page",
    badLink: "That confirmation link didn't work. It may have expired or been opened in a different browser. Log in to continue.",
    submit: "Log in",
    demoTitle: "Demo accounts (simulated sign-in)",
    demoPassword: "Password for all:",
    demoModes: { open: "open", approval: "approval required", private: "private" },
    noPage: "No page yet?",
    createOne: "Create one",
  },
  signUp: {
    metaTitle: "Create your page · Ayslock",
    noDatabase: "A new account can disappear right after you create it.",
    title: "Create your page",
    taken: (u: string) => `@${u} is taken. You can pick another in the next step.`,
    isFree: "is free. Add an email and password to keep it.",
    lead: "An email and a password. You'll pick your @username next.",
    demoStrong: "Demo sign-up.",
    demoBody: "Accounts are stored in the demo database. No email is verified.",
    submit: "Create account",
    haveOne: "Already have a page?",
    logIn: "Log in",
  },
};

const ru: typeof en = {
  email: "Email",
  password: "Пароль",
  passwordHint: "Не меньше 8 символов.",
  pending: "Секунду…",
  confirmSent: (email: string) => `Мы отправили ссылку на ${email}. Откройте её на этом устройстве, чтобы подтвердить аккаунт и закончить настройку.`,
  signIn: {
    metaTitle: "Вход · Ayslock",
    noDatabase: "Вход может слететь сразу после того, как вы войдёте.",
    title: "Вход в ваш профиль",
    badLink: "Ссылка для подтверждения не сработала. Возможно, она устарела или открыта в другом браузере. Войдите, чтобы продолжить.",
    submit: "Войти",
    demoTitle: "Демо-аккаунты (вход имитируется)",
    demoPassword: "Пароль для всех:",
    demoModes: { open: "запись сразу", approval: "с подтверждением", private: "по приглашению" },
    noPage: "Ещё нет профиля?",
    createOne: "Создать",
  },
  signUp: {
    metaTitle: "Создать профиль · Ayslock",
    noDatabase: "Новый аккаунт может пропасть сразу после создания.",
    title: "Создайте свой профиль",
    taken: (u: string) => `@${u} уже занято. Другое имя можно выбрать на следующем шаге.`,
    isFree: "свободно. Укажите email и пароль, чтобы закрепить его за собой.",
    lead: "Только email и пароль. @имя пользователя выберете дальше.",
    demoStrong: "Демо-регистрация.",
    demoBody: "Аккаунты хранятся в демо-базе. Email не проверяется.",
    submit: "Создать аккаунт",
    haveOne: "Уже есть профиль?",
    logIn: "Войти",
  },
};

export const auth = { en, ru } satisfies Record<Locale, typeof en>;
