import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { ACTIVE_COMPANY_COOKIE, activeCompanyForUser } from "@/modules/companies/context";

export async function authorizeProjectRequest(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { response: Response.json({ error: "No autenticado" }, { status: 401 }) };
  if (session.user.role !== "admin" || !session.user.twoFactorEnabled) {
    return { response: Response.json({ error: "No autorizado" }, { status: 403 }) };
  }
  const selectedId = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  const company = await activeCompanyForUser(session.user.id, selectedId);
  if (!company) return { response: Response.json({ error: "Selecciona una empresa" }, { status: 409 }) };
  if (!company.isActive && request.method !== "GET" && request.method !== "HEAD") {
    return { response: Response.json({ error: "La empresa está inactiva. Solo puedes consultar su información." }, { status: 403 }) };
  }
  return { session, company };
}
