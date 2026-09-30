import { env } from "./env";
import { fmtDate, fmtDuration, fmtTime, fmtZone } from "./format";
import type { Provider } from "./types";
import { getDict } from "@/i18n";
import type { Locale } from "@/i18n/config";

export function manageUrl(token: string) {
  return `${env.appUrl}/b/${token}`;
}
export function accessUrl(username: string, token: string) {
  return `${env.appUrl}/u/${username}?k=${token}`;
}

export function locationLine(p: Pick<Provider, "location_kind" | "location_text">, locale: Locale = "en") {
  const t = getDict(locale).common.location;
  if (p.location_kind === "online") return p.location_text ? t.online(p.location_text) : t.onlineTbd;
  return p.location_text || t.inPersonTbd;
}

interface Details {
  provider: Provider;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  clientName: string;
  clientZone: string;
  /** Language of the client's emails. Provider emails use provider.locale. */
  clientLocale: Locale;
  manageToken?: string;
}

function whenBlock(d: Details, zone: string, locale: Locale) {
  const t = getDict(locale).emails;
  const mins = Math.round((d.endsAt.getTime() - d.startsAt.getTime()) / 60000);
  return [
    `${t.service}: ${d.serviceName} (${fmtDuration(mins, locale)})`,
    `${t.date}: ${fmtDate(d.startsAt, zone, locale)}`,
    `${t.time}: ${t.timeRange(fmtTime(d.startsAt, zone, locale), fmtTime(d.endsAt, zone, locale), fmtZone(zone, d.startsAt))}`,
    `${t.where}: ${locationLine(d.provider, locale)}`,
  ].join("\n");
}

const sig = (locale: Locale) => `\n\n${getDict(locale).emails.signature}`;

function manageLine(d: Details, locale: Locale) {
  return d.manageToken ? `\n\n${getDict(locale).emails.manage}\n${manageUrl(d.manageToken)}` : "";
}

/** A client email: greeting, lead sentence, appointment details, optional manage link. */
function toClient(d: Details, subject: string, lead: string, withManage = true) {
  const L = d.clientLocale;
  const t = getDict(L).emails;
  return { subject, body: `${t.hi(d.clientName)}\n\n${lead}\n\n${whenBlock(d, d.clientZone, L)}${withManage ? manageLine(d, L) : ""}${sig(L)}` };
}

function providerLocale(p: Provider): Locale {
  return p.locale === "ru" ? "ru" : "en";
}

const bookAgain = (d: Details) => `${env.appUrl}/u/${d.provider.username}`;

export const emails = {
  confirmed: (d: Details) => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.confirmed.subject(d.serviceName, d.provider.display_name, fmtDate(d.startsAt, d.clientZone, d.clientLocale)), t.confirmed.lead(d.provider.display_name));
  },
  requested: (d: Details, expiresAt: Date) => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.requested.subject(d.serviceName, d.provider.display_name),
      t.requested.lead(d.provider.display_name, fmtDate(expiresAt, d.clientZone, d.clientLocale), fmtTime(expiresAt, d.clientZone, d.clientLocale)));
  },
  approved: (d: Details) => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.approved.subject(d.serviceName, d.provider.display_name, fmtDate(d.startsAt, d.clientZone, d.clientLocale)), t.approved.lead(d.provider.display_name));
  },
  declined: (d: Details) => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.declined.subject(d.serviceName, d.provider.display_name), t.declined.lead(d.provider.display_name, bookAgain(d)), false);
  },
  expired: (d: Details) => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.expired.subject(d.serviceName, d.provider.display_name), t.expired.lead(bookAgain(d)), false);
  },
  cancelled: (d: Details, by: "client" | "provider") => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.cancelled.subject(d.serviceName, d.provider.display_name, fmtDate(d.startsAt, d.clientZone, d.clientLocale)),
      by === "client" ? t.cancelled.byClient : t.cancelled.byProvider(d.provider.display_name), false);
  },
  rescheduled: (d: Details, pending: boolean) => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.rescheduled.subject(pending, d.serviceName, d.provider.display_name), pending ? t.rescheduled.pending(d.provider.display_name) : t.rescheduled.done);
  },
  reminder: (d: Details) => {
    const t = getDict(d.clientLocale).emails;
    return toClient(d, t.reminder.subject(d.serviceName, d.provider.display_name, fmtTime(d.startsAt, d.clientZone, d.clientLocale)), t.reminder.lead);
  },
  providerNew: (d: Details, pending: boolean) => {
    const L = providerLocale(d.provider);
    const t = getDict(L).emails;
    const zone = d.provider.timezone;
    return {
      subject: t.providerNew.subject(pending, d.clientName, `${fmtDate(d.startsAt, zone, L)} ${fmtTime(d.startsAt, zone, L)}`),
      body: `${pending ? t.providerNew.pending(d.clientName) : t.providerNew.booked(d.clientName)}\n\n${whenBlock(d, zone, L)}\n\n${t.schedule} ${env.appUrl}/dashboard${sig(L)}`,
    };
  },
  providerChanged: (d: Details, what: "cancelled" | "rescheduled") => {
    const L = providerLocale(d.provider);
    const t = getDict(L).emails;
    return {
      subject: t.providerChanged.subject(d.clientName, what, d.serviceName),
      body: `${t.providerChanged.lead(d.clientName, what)}\n\n${whenBlock(d, d.provider.timezone, L)}\n\n${t.schedule} ${env.appUrl}/dashboard${sig(L)}`,
    };
  },
  accessRequested: (p: Provider, name: string, email: string, message: string) => {
    const L = providerLocale(p);
    const t = getDict(L).emails.accessRequested;
    return {
      subject: t.subject(name),
      body: `${t.lead(name, email)}${message ? `\n\n${t.note(message)}` : ""}\n\n${t.act} ${env.appUrl}/dashboard${sig(L)}`,
    };
  },
  accessApproved: (p: Provider, name: string, link: string, expiresAt: Date, locale: Locale) => {
    const e = getDict(locale).emails;
    return {
      subject: e.accessApproved.subject(p.display_name),
      body: `${e.hi(name)}\n\n${e.accessApproved.lead(p.display_name)}\n${link}\n\n${e.accessApproved.until(fmtDate(expiresAt, p.timezone, locale))}${sig(locale)}`,
    };
  },
  accessDeclined: (p: Provider, name: string, locale: Locale) => {
    const e = getDict(locale).emails;
    return { subject: e.accessDeclined.subject(p.display_name), body: `${e.hi(name)}\n\n${e.accessDeclined.lead(p.display_name)}${sig(locale)}` };
  },
};
