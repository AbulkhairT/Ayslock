import type { Locale } from "../config";

const en = {
  hi: (name: string) => `Hi ${name},`,
  service: "Service",
  date: "Date",
  time: "Time",
  where: "Where",
  timeRange: (from: string, to: string, zone: string) => `${from} to ${to}, ${zone}`,
  manage: "Need to change something? Cancel or reschedule here:",
  signature: "Sent by Ayslock. Find your person. Pick a time. You're booked.",
  schedule: "Schedule:",
  appointment: "Appointment",
  confirmed: {
    subject: (service: string, provider: string, date: string) => `Booked: ${service} with ${provider}, ${date}`,
    lead: (provider: string) => `You're booked with ${provider}.`,
  },
  requested: {
    subject: (service: string, provider: string) => `Request sent: ${service} with ${provider}`,
    lead: (provider: string, date: string, time: string) => `Your request is pending. ${provider} needs to approve it. We'll hold the time until ${date} at ${time}.`,
  },
  approved: {
    subject: (service: string, provider: string, date: string) => `Confirmed: ${service} with ${provider}, ${date}`,
    lead: (provider: string) => `${provider} approved your request. You're booked.`,
  },
  declined: {
    subject: (service: string, provider: string) => `Request not approved: ${service} with ${provider}`,
    lead: (provider: string, link: string) => `${provider} couldn't take this request. You can pick another time at ${link}.`,
  },
  expired: {
    subject: (service: string, provider: string) => `Request expired: ${service} with ${provider}`,
    lead: (link: string) => `Your request wasn't approved in time, so the slot was released. You can pick another time at ${link}.`,
  },
  cancelled: {
    subject: (service: string, provider: string, date: string) => `Cancelled: ${service} with ${provider}, ${date}`,
    byClient: "Your appointment is cancelled.",
    byProvider: (provider: string) => `${provider} cancelled this appointment.`,
  },
  rescheduled: {
    subject: (pending: boolean, service: string, provider: string) => `${pending ? "New time requested" : "Rescheduled"}: ${service} with ${provider}`,
    pending: (provider: string) => `Your new time is pending until ${provider} approves it.`,
    done: "Your appointment has a new time.",
  },
  reminder: {
    subject: (service: string, provider: string, time: string) => `Tomorrow: ${service} with ${provider} at ${time}`,
    lead: "A reminder about your appointment.",
  },
  providerNew: {
    subject: (pending: boolean, client: string, when: string) => `${pending ? "New request" : "New booking"}: ${client}, ${when}`,
    pending: (client: string) => `${client} requested a time. Approve or decline it in your schedule.`,
    booked: (client: string) => `${client} booked with you.`,
  },
  providerChanged: {
    subject: (client: string, what: "cancelled" | "rescheduled", service: string) => `${client} ${what} ${service}`,
    lead: (client: string, what: "cancelled" | "rescheduled") => `${client} ${what} their appointment.`,
  },
  accessRequested: {
    subject: (name: string) => `${name} asked to book with you`,
    lead: (name: string, email: string) => `${name} (${email}) asked for access to your booking times.`,
    note: (message: string) => `Their note: ${message}`,
    act: "Approve or decline:",
  },
  accessApproved: {
    subject: (provider: string) => `${provider} approved your booking access`,
    lead: (provider: string) => `${provider} approved your request. Use this private link to see times and book:`,
    until: (date: string) => `The link works until ${date}. Please don't share it.`,
  },
  accessDeclined: {
    subject: (provider: string) => `Booking access with ${provider}`,
    lead: (provider: string) => `${provider} isn't taking new bookings through Ayslock right now.`,
  },
  calendar: {
    title: (service: string, provider: string) => `${service} with ${provider}`,
    manage: "Change or cancel:",
  },
};

const ru: typeof en = {
  hi: (name: string) => `Здравствуйте, ${name}!`,
  service: "Услуга",
  date: "Дата",
  time: "Время",
  where: "Где",
  timeRange: (from: string, to: string, zone: string) => `${from}–${to}, ${zone}`,
  manage: "Нужно что-то изменить? Отменить или перенести запись можно здесь:",
  signature: "Отправлено через Ayslock. Найдите своего мастера. Выберите время. Готово.",
  schedule: "Расписание:",
  appointment: "Запись",
  confirmed: {
    subject: (service: string, provider: string, date: string) => `Вы записаны: ${service}, ${provider}, ${date}`,
    lead: (provider: string) => `Вы записаны к специалисту ${provider}.`,
  },
  requested: {
    subject: (service: string, provider: string) => `Запрос отправлен: ${service}, ${provider}`,
    lead: (provider: string, date: string, time: string) => `Ваш запрос ждёт подтверждения от специалиста ${provider}. Мы держим это время за вами до ${date}, ${time}.`,
  },
  approved: {
    subject: (service: string, provider: string, date: string) => `Подтверждено: ${service}, ${provider}, ${date}`,
    lead: (provider: string) => `${provider} подтвердил(а) ваш запрос. Вы записаны.`,
  },
  declined: {
    subject: (service: string, provider: string) => `Запрос не подтверждён: ${service}, ${provider}`,
    lead: (provider: string, link: string) => `${provider} не может принять этот запрос. Выберите другое время: ${link}`,
  },
  expired: {
    subject: (service: string, provider: string) => `Срок запроса истёк: ${service}, ${provider}`,
    lead: (link: string) => `Запрос не подтвердили вовремя, и время освободилось. Выберите другое время: ${link}`,
  },
  cancelled: {
    subject: (service: string, provider: string, date: string) => `Отменено: ${service}, ${provider}, ${date}`,
    byClient: "Ваша запись отменена.",
    byProvider: (provider: string) => `${provider} отменил(а) эту запись.`,
  },
  rescheduled: {
    subject: (pending: boolean, service: string, provider: string) => `${pending ? "Запрошено новое время" : "Запись перенесена"}: ${service}, ${provider}`,
    pending: (provider: string) => `Новое время ждёт подтверждения от специалиста ${provider}.`,
    done: "У вашей записи новое время.",
  },
  reminder: {
    subject: (service: string, provider: string, time: string) => `Завтра: ${service}, ${provider}, в ${time}`,
    lead: "Напоминаем о вашей записи.",
  },
  providerNew: {
    subject: (pending: boolean, client: string, when: string) => `${pending ? "Новый запрос" : "Новая запись"}: ${client}, ${when}`,
    pending: (client: string) => `${client} запрашивает время. Подтвердите или отклоните запрос в расписании.`,
    booked: (client: string) => `${client} записался(-ась) к вам.`,
  },
  providerChanged: {
    subject: (client: string, what: "cancelled" | "rescheduled", service: string) => `${client} ${what === "cancelled" ? "отменил(а)" : "перенёс(-ла)"}: ${service}`,
    lead: (client: string, what: "cancelled" | "rescheduled") => `${client} ${what === "cancelled" ? "отменил(а)" : "перенёс(-ла)"} свою запись.`,
  },
  accessRequested: {
    subject: (name: string) => `${name} хочет записаться к вам`,
    lead: (name: string, email: string) => `${name} (${email}) просит доступ к вашему расписанию.`,
    note: (message: string) => `Сообщение: ${message}`,
    act: "Подтвердить или отклонить:",
  },
  accessApproved: {
    subject: (provider: string) => `${provider} открыл(а) вам запись`,
    lead: (provider: string) => `${provider} одобрил(а) ваш запрос. По этой личной ссылке можно посмотреть время и записаться:`,
    until: (date: string) => `Ссылка действует до ${date}. Пожалуйста, не передавайте её другим.`,
  },
  accessDeclined: {
    subject: (provider: string) => `Запись к специалисту ${provider}`,
    lead: (provider: string) => `${provider} сейчас не принимает новых клиентов через Ayslock.`,
  },
  calendar: {
    title: (service: string, provider: string) => `${service}, ${provider}`,
    manage: "Изменить или отменить:",
  },
};

export const emails = { en, ru } satisfies Record<Locale, typeof en>;
