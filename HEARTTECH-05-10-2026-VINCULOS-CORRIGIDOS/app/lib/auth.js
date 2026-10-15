import crypto from "crypto";

const COOKIE_NAME = "hearttech_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret =
    process.env.HEARTTECH_SESSION_SECRET ||
    process.env.SESSION_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "HEARTTECH_SESSION_SECRET é obrigatório em produção."
    );
  }

  return "heart-tech-development-secret-change-before-production";
}

function encode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionValue(user) {
  const payload = encode(
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email || null,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    })
  );

  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(value) {
  if (!value || typeof value !== "string") return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(decode(payload));
    if (!session?.id || !session?.role || !session?.exp) return null;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request) {
  const value = request.cookies.get(COOKIE_NAME)?.value;
  return verifySessionValue(value);
}

export function setSessionCookie(response, user) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: createSessionValue(user),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

export function requireSession(request, allowedRoles = []) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: "Sessão expirada ou não autenticada.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(session.role)
  ) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: "Você não possui permissão para esta operação.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { ok: true, session };
}

export { COOKIE_NAME, SESSION_TTL_SECONDS };
