import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/employees/search"]);

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
}

type Role = "employee" | "provider" | "admin";

async function readRole(token: string | undefined): Promise<Role | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.role as Role) ?? null;
  } catch {
    return null;
  }
}

const ROLE_HOME: Record<Role, string> = {
  employee: "/inscription",
  provider: "/prestataire",
  admin: "/dashboard",
};

function deny(req: NextRequest, role: Role | null) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "forbidden" }, { status: role ? 403 : 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = role ? ROLE_HOME[role] : "/login";
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/cron/") || PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  const role = await readRole(token);

  if (!role) {
    return deny(req, null);
  }

  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/inscription") && role !== "employee") return deny(req, role);
  if (pathname.startsWith("/prestataire") && !["provider", "admin"].includes(role)) return deny(req, role);
  if (pathname.startsWith("/dashboard") && !["admin", "provider"].includes(role)) return deny(req, role);
  if (pathname.startsWith("/admin") && role !== "admin") return deny(req, role);
  if (pathname.startsWith("/api/admin") && role !== "admin") return deny(req, role);
  if (pathname.startsWith("/api/attendance/actual") && !["provider", "admin"].includes(role)) return deny(req, role);
  if (pathname.startsWith("/api/dashboard") && !["admin", "provider"].includes(role)) return deny(req, role);

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
