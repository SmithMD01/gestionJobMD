import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ACTIVE_COMPANY_COOKIE, selectableCompanyForUser, companyCookieOptions } from "@/modules/companies/context";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });

  const parsed = z.object({ companyId: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Empresa no válida" }, { status: 400 });
  const selected = await selectableCompanyForUser(session.user.id, parsed.data.companyId);
  if (!selected) return Response.json({ error: "No perteneces a esta empresa" }, { status: 403 });

  (await cookies()).set(ACTIVE_COMPANY_COOKIE, selected.id, companyCookieOptions());
  return Response.json({ company: selected });
}
