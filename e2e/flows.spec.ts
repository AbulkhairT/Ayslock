import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SCREENSHOTS ? "docs/screenshots" : null;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function pickFirstTime(page: Page) {
  const times = page.getByRole("group").getByRole("button");
  await expect(times.first()).toBeVisible();
  await times.first().click();
}

async function book(page: Page, username: string, name: string, email: string) {
  await page.goto(`/u/${username}`);
  await page.getByRole("button", { name: /Book$/ }).first().click();
  await pickFirstTime(page);
  await page.getByRole("button", { name: /^Continue with/ }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
}

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("ayslock-demo");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function outboxLink(page: Page, pattern: RegExp) {
  await page.goto("/demo/outbox");
  const text = await page.locator("main").innerText();
  const m = text.match(pattern);
  expect(m, `outbox contains ${pattern}`).toBeTruthy();
  return m![0];
}

test("home search: names and @usernames, privacy, empty state, then straight to booking", async ({ page }) => {
  await page.goto("/");
  await shot(page, "01-home");
  const box = page.getByLabel("Enter a name or @username");
  // First database touch on a fresh demo database runs migrations and the seed.
  await box.fill("nobody here");
  await expect(page.getByText("No one found for “nobody here”.")).toBeVisible({ timeout: 20_000 });
  // Invite-only providers never show up by name.
  await box.fill("Lindqvist");
  await expect(page.getByText("No one found for “Lindqvist”.")).toBeVisible();
  await box.fill("bell");
  const results = page.getByRole("list", { name: "Search results" });
  await expect(results.getByRole("link")).toHaveCount(1);
  await expect(results.getByText("@marco · Barber")).toBeVisible();
  await shot(page, "01b-search");
  await results.getByRole("link", { name: /Marco Bellini/ }).click();
  await expect(page).toHaveURL(/\/u\/marco$/);
  await expect(page.getByText("Barber", { exact: true })).toBeVisible();
  // An exact @username goes straight to the page, even for invite-only providers.
  await page.goto("/");
  await box.fill("@Sofia");
  await expect(page.getByRole("list", { name: "Search results" }).getByText("Sofia Lindqvist")).toBeVisible();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/u\/sofia$/);
  // Without JavaScript the form still works.
  await page.goto("/?q=%40marco");
  await expect(page).toHaveURL(/\/u\/marco$/);
  // Shared links open the booking page directly.
  await page.goto("/@lena");
  await expect(page.getByRole("heading", { name: "Lena Okafor" })).toBeVisible();
});

test("open booking end to end, then reschedule, calendar file and cancel", async ({ page, request }) => {
  await page.goto("/u/marco");
  await expect(page.getByRole("heading", { name: "Marco Bellini" })).toBeVisible();
  await shot(page, "02-profile");
  await page.getByRole("button", { name: /Haircut/ }).click();
  await expect(page.getByLabel("Times shown in")).toHaveValue("Europe/Berlin");
  await pickFirstTime(page);
  await shot(page, "03-pick-time");
  await page.getByRole("button", { name: /^Continue with/ }).click();
  await expect(page.getByText("Europe/Berlin", { exact: false }).first()).toBeVisible();
  await page.getByLabel("Your name").fill("Riley Demo");
  await page.getByLabel("Email").fill("riley.demo@example.com");
  await shot(page, "04-details");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
  await expect(page.getByText(/Europe\/Berlin|Europe\/ Berlin|Europe Berlin/).first()).toBeVisible();
  await shot(page, "05-confirmed");
  const manageUrl = page.url().split("?")[0];

  const ics = await request.get(`${manageUrl}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("SUMMARY:Haircut with Marco Bellini");

  await page.getByRole("button", { name: /Save Marco Bellini/ }).click();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Marco Bellini/ })).toBeVisible();

  await page.goto(manageUrl);
  await page.getByRole("button", { name: "Reschedule" }).click();
  const times = page.getByRole("group").getByRole("button");
  await expect(times.first()).toBeVisible();
  // Late in the day only one or two times may be left, so take the last one shown.
  await times.last().click();
  await page.getByRole("button", { name: /^Move to/ }).click();
  await expect(page.getByText("Your new time is saved.")).toBeVisible();

  await page.getByText("Cancel booking").click();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.getByRole("heading", { name: "This booking is cancelled" })).toBeVisible();

  const outbox = await page.goto("/demo/outbox");
  expect(outbox?.ok()).toBeTruthy();
  await expect(page.getByText("Booked: Haircut with Marco Bellini").first()).toBeVisible();
  await expect(page.getByText(/Previewed \(not sent\)/).first()).toBeVisible();
  await shot(page, "10-notification-preview");
});

test("a slot taken by someone else is refused with a clear message", async ({ page, browser }) => {
  await book(page, "marco", "First Person", "first.demo@example.com");
  const other = await browser.newPage({ timezoneId: "America/New_York" });
  await book(other, "marco", "Second Person", "second.demo@example.com");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
  await other.getByRole("button", { name: "Confirm booking" }).click();
  await expect(other.getByText("Someone just booked that time")).toBeVisible();
  await expect(other.getByRole("heading", { name: "Pick a time" })).toBeVisible();
});

test("approval mode: request is pending, provider approves", async ({ page, browser }) => {
  await book(page, "lena", "Sam Demo", "sam.demo@example.com");
  await expect(page.getByText(/held as pending/)).toBeVisible();
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByRole("heading", { name: /Waiting for approval/ })).toBeVisible();
  await shot(page, "06-pending");
  const manageUrl = page.url().split("?")[0];

  const provider = await browser.newPage();
  await signIn(provider, "lena@example.com");
  // The provider sees the new request at the top of their schedule, with a count on the tab.
  const fresh = provider.getByRole("region", { name: /new booking/ });
  await expect(fresh.getByText(/Sam Demo/)).toBeVisible();
  await expect(fresh.getByText("Wants approval").first()).toBeVisible();
  const card = provider.locator("section[aria-labelledby=pending-title] li", { hasText: "Sam Demo" }).first();
  await expect(card).toBeVisible();
  await shot(provider, "07-provider-schedule");
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(provider.getByText("Approved. The client has been notified.")).toBeVisible();
  await provider.getByRole("button", { name: "Mark as seen" }).click();
  await expect(provider.getByRole("region", { name: /new booking/ })).toHaveCount(0);

  await page.goto(manageUrl);
  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
});

test("private mode: no availability without an approved, unrevoked link", async ({ page, browser, request }) => {
  await page.goto("/u/sofia");
  await expect(page.getByRole("heading", { name: "Ask to book" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Book$/ })).toHaveCount(0);
  const html = await (await request.get("/u/sofia")).text();
  expect(html).not.toContain("/api/slots");
  await shot(page, "08-private-request");

  await page.getByLabel("Your name").fill("Jo Demo");
  await page.getByLabel("Email").fill("jo.demo@example.com");
  await page.getByRole("button", { name: "Request access" }).click();
  await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();

  const provider = await browser.newPage();
  await signIn(provider, "sofia@example.com");
  await provider.locator("li", { hasText: "Jo Demo" }).getByRole("button", { name: "Approve" }).click();
  await expect(provider.getByText(/Access approved/)).toBeVisible();

  const found = await outboxLink(page, /https?:\/\/[^\s/]+\/u\/sofia\?k=[A-Za-z0-9_.-]+/);
  const link = found.replace(/^https?:\/\/[^/]+/, "");
  await page.goto(link);
  await expect(page.getByText(/Private booking link for Jo Demo/)).toBeVisible();
  await page.getByRole("button", { name: /Book$/ }).first().click();
  await expect(page.getByRole("group").getByRole("button").first()).toBeVisible();
  await shot(page, "09-private-with-link");

  await provider.goto("/dashboard");
  await provider.locator("li", { hasText: "Jo Demo" }).getByRole("button", { name: "Turn off" }).click();
  await expect(provider.getByText("Link turned off.")).toBeVisible();
  await page.goto(link);
  await expect(page.getByText(/expired or was turned off/)).toBeVisible();
  const k = new URL(link, "http://x").searchParams.get("k")!;
  const svc = await request.get(`/api/slots?u=sofia&service=00000000-0000-0000-0000-000000000000&from=${new Date().toISOString()}&to=${new Date(Date.now() + 86400e3).toISOString()}&k=${k}`);
  expect(svc.status()).toBe(403);
});

test("provider sign-up, onboarding and the ready screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Create your profile" }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByLabel("Email").fill(`new${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Your name").fill("Jordan Park");
  await page.getByLabel("What you do").fill("Personal trainer");
  await page.getByLabel("Username").fill("Jordan_Trains");
  await page.getByLabel("Meeting details").or(page.getByLabel("Address or area")).fill("Riverside Park, north gate");
  await shot(page, "11-onboarding");
  await page.getByRole("button", { name: "Next: services" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Personal training");
  await page.getByLabel("Price (optional)").fill("60");
  await page.getByRole("button", { name: "Next: hours" }).click();
  await expect(page.getByLabel("Monday")).toBeChecked();
  await expect(page.getByLabel("Saturday")).not.toBeChecked();
  await page.getByRole("button", { name: "Create my Ayslock" }).click();
  await expect(page.getByRole("heading", { name: "Your Ayslock is ready." })).toBeVisible();
  await expect(page.getByText(/\/@jordan_trains$/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy @jordan_trains" }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  await shot(page, "12-ready");

  await page.goto("/u/Jordan_Trains");
  await expect(page.getByRole("heading", { name: "Jordan Park" })).toBeVisible();
});
