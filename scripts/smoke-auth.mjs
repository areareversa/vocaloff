const base = "http://localhost:3000";

const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: base },
  body: JSON.stringify({ email: "appvocaloff@gmail.com", password: "dqgh3ffrdg" }),
});

console.log("status:", signIn.status);
const body = await signIn.json().catch(() => null);
console.log("user:", body?.user ? { email: body.user.email, role: body.user.role } : body);

const cookies = signIn.headers.getSetCookie?.() ?? [];
const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

const session = await fetch(`${base}/api/auth/get-session`, {
  headers: { cookie: cookieHeader },
});
const sessionBody = await session.json().catch(() => null);
console.log("session:", session.status, sessionBody?.user?.email ?? sessionBody);
