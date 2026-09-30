import { env } from "./env";
import { fmtDate, fmtDuration, fmtTime, fmtZone } from "./format";
import type { Provider } from "./types";

export function manageUrl(token: string) {
  return `${env.appUrl}/b/${token}`;
}
export function accessUrl(username: string, token: string) {
  return `${env.appUrl}/u/${username}?k=${token}`;
}

export function locationLine(p: Pick<Provider, "location_kind" | "location_text">) {
  if (p.location_kind === "online") return p.location_text ? `Online: ${p.location_text}` : "Online (details from your provider)";
  return p.location_text || "Location from your provider";
}

interface Details {
  provider: Provider;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  clientName: string;
  clientZone: string;
  manageToken?: string;
}

function whenBlock(d: Details, zone: string) {
  const mins = Math.round((d.endsAt.getTime() - d.startsAt.getTime()) / 60000);
  return [
    `Service: ${d.serviceName} (${fmtDuration(mins)})`,
    `Date: ${fmtDate(d.startsAt, zone)}`,
    `Time: ${fmtTime(d.startsAt, zone)} to ${fmtTime(d.endsAt, zone)}, ${fmtZone(zone, d.startsAt)}`,
    `Where: ${locationLine(d.provider)}`,
  ].join("\n");
}

const sig = "\n\nSent by Ayslock. Find your person. Pick a time. You're booked.";

function manageLine(d: Details) {
  return d.manageToken ? `\n\nNeed to change something? Cancel or reschedule here:\n${manageUrl(d.manageToken)}` : "";
}

export const emails = {
  confirmed: (d: Details) => ({
    subject: `Booked: ${d.serviceName} with ${d.provider.display_name}, ${fmtDate(d.startsAt, d.clientZone)}`,
    body: `Hi ${d.clientName},\n\nYou're booked with ${d.provider.display_name}.\n\n${whenBlock(d, d.clientZone)}${manageLine(d)}${sig}`,
  }),
  requested: (d: Details, expiresAt: Date) => ({
    subject: `Request sent: ${d.serviceName} with ${d.provider.display_name}`,
    body: `Hi ${d.clientName},\n\nYour request is pending. ${d.provider.display_name} needs to approve it. We'll hold the time until ${fmtDate(expiresAt, d.clientZone)} at ${fmtTime(expiresAt, d.clientZone)}.\n\n${whenBlock(d, d.clientZone)}${manageLine(d)}${sig}`,
  }),
  approved: (d: Details) => ({
    subject: `Confirmed: ${d.serviceName} with ${d.provider.display_name}, ${fmtDate(d.startsAt, d.clientZone)}`,
    body: `Hi ${d.clientName},\n\n${d.provider.display_name} approved your request. You're booked.\n\n${whenBlock(d, d.clientZone)}${manageLine(d)}${sig}`,
  }),
  declined: (d: Details) => ({
    subject: `Request not approved: ${d.serviceName} with ${d.provider.display_name}`,
    body: `Hi ${d.clientName},\n\n${d.provider.display_name} couldn't take this request. You can pick another time at ${env.appUrl}/u/${d.provider.username}.\n\n${whenBlock(d, d.clientZone)}${sig}`,
  }),
  expired: (d: Details) => ({
    subject: `Request expired: ${d.serviceName} with ${d.provider.display_name}`,
    body: `Hi ${d.clientName},\n\nYour request wasn't approved in time, so the slot was released. You can pick another time at ${env.appUrl}/u/${d.provider.username}.\n\n${whenBlock(d, d.clientZone)}${sig}`,
  }),
  cancelled: (d: Details, by: "client" | "provider") => ({
    subject: `Cancelled: ${d.serviceName} with ${d.provider.display_name}, ${fmtDate(d.startsAt, d.clientZone)}`,
    body: `Hi ${d.clientName},\n\n${by === "client" ? "Your appointment is cancelled." : `${d.provider.display_name} cancelled this appointment.`}\n\n${whenBlock(d, d.clientZone)}${sig}`,
  }),
  rescheduled: (d: Details, pending: boolean) => ({
    subject: `${pending ? "New time requested" : "Rescheduled"}: ${d.serviceName} with ${d.provider.display_name}`,
    body: `Hi ${d.clientName},\n\n${pending ? `Your new time is pending until ${d.provider.display_name} approves it.` : "Your appointment has a new time."}\n\n${whenBlock(d, d.clientZone)}${manageLine(d)}${sig}`,
  }),
  reminder: (d: Details) => ({
    subject: `Tomorrow: ${d.serviceName} with ${d.provider.display_name} at ${fmtTime(d.startsAt, d.clientZone)}`,
    body: `Hi ${d.clientName},\n\nA reminder about your appointment.\n\n${whenBlock(d, d.clientZone)}${manageLine(d)}${sig}`,
  }),
  providerNew: (d: Details, pending: boolean) => ({
    subject: `${pending ? "New request" : "New booking"}: ${d.clientName}, ${fmtDate(d.startsAt, d.provider.timezone)} ${fmtTime(d.startsAt, d.provider.timezone)}`,
    body: `${pending ? `${d.clientName} requested a time. Approve or decline it in your schedule.` : `${d.clientName} booked with you.`}\n\n${whenBlock(d, d.provider.timezone)}\n\nSchedule: ${env.appUrl}/dashboard${sig}`,
  }),
  providerChanged: (d: Details, what: "cancelled" | "rescheduled") => ({
    subject: `${d.clientName} ${what} ${d.serviceName}`,
    body: `${d.clientName} ${what} their appointment.\n\n${whenBlock(d, d.provider.timezone)}\n\nSchedule: ${env.appUrl}/dashboard${sig}`,
  }),
  accessRequested: (p: Provider, name: string, email: string, message: string) => ({
    subject: `${name} asked to book with you`,
    body: `${name} (${email}) asked for access to your booking times.${message ? `\n\nTheir note: ${message}` : ""}\n\nApprove or decline: ${env.appUrl}/dashboard${sig}`,
  }),
  accessApproved: (p: Provider, name: string, link: string, expiresAt: Date) => ({
    subject: `${p.display_name} approved your booking access`,
    body: `Hi ${name},\n\n${p.display_name} approved your request. Use this private link to see times and book:\n${link}\n\nThe link works until ${fmtDate(expiresAt, p.timezone)}. Please don't share it.${sig}`,
  }),
  accessDeclined: (p: Provider, name: string) => ({
    subject: `Booking access with ${p.display_name}`,
    body: `Hi ${name},\n\n${p.display_name} isn't taking new bookings through Ayslock right now.${sig}`,
  }),
};
