/**
 * DeadlineOS → Google Calendar (one-way).
 * Creates/updates/deletes Google events for tasks with due/scheduled times.
 */

import { prisma } from "./prisma";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_CAL = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
].join(" ");

function appUrl() {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

export function getGoogleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${appUrl()}/api/google/callback`
  );
}

export function buildGoogleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Google token exchange failed");
  }
  return data;
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || "Failed to refresh Google access token");
  }
  return data;
}

export async function getGoogleConnectionStatus(userId: string) {
  const conn = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: {
      connectedEmail: true,
      calendarId: true,
      updatedAt: true,
      createdAt: true,
    },
  });
  return {
    configured: isGoogleCalendarConfigured(),
    connected: Boolean(conn),
    email: conn?.connectedEmail || null,
    calendarId: conn?.calendarId || "primary",
    connectedAt: conn?.createdAt?.toISOString() || null,
  };
}

export async function saveGoogleConnection(
  userId: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  },
  connectedEmail?: string | null
) {
  const existing = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  });
  const refreshToken = tokens.refresh_token || existing?.refreshToken;
  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Disconnect and reconnect with consent.");
  }
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  return prisma.googleCalendarConnection.upsert({
    where: { userId },
    create: {
      userId,
      refreshToken,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
      connectedEmail: connectedEmail || null,
      calendarId: "primary",
    },
    update: {
      refreshToken,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
      connectedEmail: connectedEmail ?? undefined,
    },
  });
}

export async function disconnectGoogleCalendar(userId: string) {
  await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
  // Keep googleEventId on tasks so reconnect can update; optional clear:
  // await prisma.task.updateMany({ where: { userId }, data: { googleEventId: null, googleSyncedAt: null } });
}

async function getValidAccessToken(userId: string): Promise<{
  token: string;
  calendarId: string;
} | null> {
  if (!isGoogleCalendarConfigured()) return null;
  const conn = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!conn) return null;

  const stillValid =
    conn.accessToken &&
    conn.accessTokenExpiresAt &&
    conn.accessTokenExpiresAt.getTime() > Date.now() + 60_000;

  if (stillValid && conn.accessToken) {
    return { token: conn.accessToken, calendarId: conn.calendarId || "primary" };
  }

  const refreshed = await refreshAccessToken(conn.refreshToken);
  const expiresAt = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000)
    : null;
  await prisma.googleCalendarConnection.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      accessTokenExpiresAt: expiresAt,
    },
  });
  return {
    token: refreshed.access_token!,
    calendarId: conn.calendarId || "primary",
  };
}

export async function fetchGoogleUserEmail(accessToken: string) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email || null;
  } catch {
    return null;
  }
}

type TaskLike = {
  id: string;
  title: string;
  notes: string | null;
  linkUrl?: string | null;
  category: string;
  status: string;
  dueAt: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  durationMin: number;
  googleEventId: string | null;
};

function buildEventBody(task: TaskLike) {
  const description = [
    task.notes || "",
    task.linkUrl ? `Link: ${task.linkUrl}` : "",
    `Category: ${task.category}`,
    "Synced from DeadlineOS (one-way).",
  ]
    .filter(Boolean)
    .join("\n");

  const start = task.scheduledStart || task.dueAt;
  if (!start) return null;

  const end =
    task.scheduledEnd ||
    new Date(start.getTime() + Math.max(task.durationMin || 60, 30) * 60_000);

  // Timed event when we have clock times; all-day if only due date at noon-ish from calendar click
  const useAllDay =
    !task.scheduledStart &&
    task.dueAt &&
    task.dueAt.getUTCHours() === 12 &&
    task.dueAt.getUTCMinutes() === 0;

  if (useAllDay && task.dueAt) {
    const day = task.dueAt.toISOString().slice(0, 10);
    const next = new Date(task.dueAt);
    next.setUTCDate(next.getUTCDate() + 1);
    return {
      summary: `[DeadlineOS] ${task.title}`,
      description,
      start: { date: day },
      end: { date: next.toISOString().slice(0, 10) },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 24 * 60 },
          { method: "email", minutes: 24 * 60 },
        ],
      },
    };
  }

  return {
    summary: `[DeadlineOS] ${task.title}`,
    description,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 24 * 60 },
        { method: "email", minutes: 24 * 60 },
      ],
    },
  };
}

/**
 * Push one task to Google. No-op if not connected or no schedule/due.
 * Deletes Google event when task is done/skipped or loses dates.
 */
export async function syncTaskToGoogle(userId: string, taskId: string): Promise<void> {
  try {
    const auth = await getValidAccessToken(userId);
    if (!auth) return;

    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) return;

    const shouldRemove =
      task.status === "done" ||
      task.status === "skipped" ||
      (!task.dueAt && !task.scheduledStart);

    if (shouldRemove) {
      if (task.googleEventId) {
        await fetch(
          `${GOOGLE_CAL}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(task.googleEventId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${auth.token}` },
          }
        ).catch(() => null);
        await prisma.task.update({
          where: { id: task.id },
          data: { googleEventId: null, googleSyncedAt: new Date() },
        });
      }
      return;
    }

    const body = buildEventBody(task);
    if (!body) return;

    if (task.googleEventId) {
      const res = await fetch(
        `${GOOGLE_CAL}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(task.googleEventId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        await prisma.task.update({
          where: { id: task.id },
          data: { googleSyncedAt: new Date() },
        });
        return;
      }
      // Event missing → create fresh
      if (res.status !== 404) {
        console.warn("[google-calendar] patch failed", await res.text());
      }
    }

    const createRes = await fetch(
      `${GOOGLE_CAL}/calendars/${encodeURIComponent(auth.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!createRes.ok) {
      console.warn("[google-calendar] create failed", await createRes.text());
      return;
    }
    const created = (await createRes.json()) as { id?: string };
    if (created.id) {
      await prisma.task.update({
        where: { id: task.id },
        data: { googleEventId: created.id, googleSyncedAt: new Date() },
      });
    }
  } catch (err) {
    console.warn("[google-calendar] syncTaskToGoogle:", err);
  }
}

/** After Accept plan — push all scheduled tasks */
export async function syncAcceptedPlanToGoogle(userId: string, taskIds: string[]) {
  const unique = [...new Set(taskIds.filter(Boolean))];
  for (const id of unique) {
    await syncTaskToGoogle(userId, id);
  }
}

export async function deleteGoogleEventForTask(userId: string, taskId: string) {
  try {
    const auth = await getValidAccessToken(userId);
    if (!auth) return;
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task?.googleEventId) return;
    await fetch(
      `${GOOGLE_CAL}/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(task.googleEventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      }
    ).catch(() => null);
  } catch (err) {
    console.warn("[google-calendar] delete event:", err);
  }
}
