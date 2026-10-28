import "dotenv/config";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { config } from "dotenv";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { account, user } from "../src/db/auth-schema";
import { securityEvent } from "../src/db/schema";
import { project, projectAuditEvent, projectDocument } from "../src/modules/projects/schema";
import { company, companyMember, companyTeamMember } from "../src/modules/companies/schema";
import { auditEvent } from "../src/modules/audit/schema";

config({ path: ".env" });

const baseURL = process.env.BETTER_AUTH_URL;
const databaseURL = process.env.DATABASE_URL;

if (process.env.AUTH_FLOW_TEST !== "1" || baseURL !== "http://localhost:3000" || !databaseURL?.includes("@127.0.0.1:5433/gestion_job")) {
  throw new Error("This test runs only against the local development database with AUTH_FLOW_TEST=1");
}

function base32Decode(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let bitCount = 0;
  const output: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/, "")) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid TOTP secret");
    bits = (bits << 5) | digit;
    bitCount += 5;
    if (bitCount >= 8) {
      bitCount -= 8;
      output.push((bits >>> bitCount) & 0xff);
    }
  }
  return Buffer.from(output);
}

function totp(uri: string) {
  const secret = new URL(uri).searchParams.get("secret");
  if (!secret) throw new Error("TOTP URI lacks a secret");
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}

async function main() {
  const adminId = randomUUID();
  const email = `phase1-${adminId}@example.invalid`;
  const childEmail = `child-${adminId}@example.invalid`;
  const password = randomBytes(24).toString("hex");
  const cookieJar = new Map<string, string>();
  const projectIds: string[] = [];
  const companyIds: string[] = [];

  async function request(path: string, body?: object, method?: string) {
    const response = await fetch(new URL(path, baseURL), {
      method: method ?? (body ? "POST" : "GET"),
      headers: {
        origin: baseURL!,
        ...(body ? { "content-type": "application/json" } : {}),
        cookie: Array.from(cookieJar, ([key, value]) => `${key}=${value}`).join("; "),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    for (const item of response.headers.getSetCookie()) {
      const [pair] = item.split(";");
      const separator = pair.indexOf("=");
      if (separator > 0) cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const payload = await response.json().catch(() => null);
    return { status: response.status, payload };
  }

  async function uploadDocument(projectId: string, uploadKey: string) {
    const form = new FormData();
    form.set("groupId", "functional");
    form.set("typeId", "srs");
    form.set("uploadKey", uploadKey);
    form.set("file", new File(["Contenido de prueba"], "prueba.txt", { type: "text/plain" }));
    const response = await fetch(new URL(`/api/projects/${projectId}/documents`, baseURL), {
      method: "POST",
      headers: { origin: baseURL!, cookie: Array.from(cookieJar, ([key, value]) => `${key}=${value}`).join("; ") },
      body: form,
    });
    return { status: response.status, payload: await response.json().catch(() => null) };
  }

  await db.insert(user).values({ id: adminId, name: "Phase 1 test", email, emailVerified: true, role: "admin" });
  try {
    await db.insert(account).values({ id: randomUUID(), accountId: adminId, providerId: "credential", userId: adminId, password: await hashPassword(password) });

    const signIn = await request("/api/auth/sign-in/email", { email, password });
    if (signIn.status !== 200) throw new Error(`Sign-in failed: ${signIn.status}`);

    const before = await request("/api/auth/admin/list-users");
    if (before.status !== 403) throw new Error(`Admin access before TOTP should be 403, got ${before.status}`);
    const beforePage = await request("/users");
    if (beforePage.status !== 307) throw new Error(`Admin page before TOTP should redirect, got ${beforePage.status}`);

    const enrollment = await request("/api/auth/two-factor/enable", { password, method: "totp" });
    const uri = enrollment.payload?.totpURI;
    if (enrollment.status !== 200 || typeof uri !== "string") throw new Error(`TOTP enrollment failed: ${enrollment.status}`);

    const verification = await request("/api/auth/two-factor/verify-totp", { code: totp(uri) });
    if (verification.status !== 200) throw new Error(`TOTP verification failed: ${verification.status}`);

    const after = await request("/api/auth/admin/list-users");
    if (after.status !== 200) throw new Error(`Admin access after TOTP failed: ${after.status}`);
    const afterPage = await request("/users");
    if (afterPage.status !== 200) throw new Error(`Admin page after TOTP failed: ${afterPage.status}`);

    const companyA = await request("/api/companies", { name: "Empresa A de prueba" });
    if (companyA.status !== 201 || typeof companyA.payload?.company?.id !== "string") {
      throw new Error(`Company A creation failed: ${companyA.status}`);
    }
    const companyAId: string = companyA.payload.company.id;
    companyIds.push(companyAId);

    const projectData = {
      name: "Proyecto de prueba",
      objective: "Verificar el módulo de proyectos",
      description: "Cuenta y proyecto descartables",
      status: "planned",
      startDate: "2026-10-23",
      endDate: "2026-10-30",
    };
    const adminCookiesBeforeProject = new Map(cookieJar);
    cookieJar.clear();
    const anonymousProjects = await request("/api/projects");
    if (anonymousProjects.status !== 401) throw new Error(`Anonymous project access should be 401, got ${anonymousProjects.status}`);
    const anonymousPage = await request("/projects");
    if (anonymousPage.status !== 307) throw new Error(`Anonymous project page should redirect, got ${anonymousPage.status}`);
    for (const [key, value] of adminCookiesBeforeProject) cookieJar.set(key, value);

    const invalidProject = await request("/api/projects", { ...projectData, endDate: "2026-10-22" });
    if (invalidProject.status !== 400) throw new Error(`Invalid project dates should be rejected, got ${invalidProject.status}`);
    const createdProject = await request("/api/projects", projectData);
    if (createdProject.status !== 201 || typeof createdProject.payload?.project?.id !== "string") {
      throw new Error(`Project creation failed: ${createdProject.status}`);
    }
    const createdProjectId: string = createdProject.payload.project.id;
    projectIds.push(createdProjectId);
    if (createdProject.payload.project.companyId !== companyAId) throw new Error("Project was not assigned to company A");
    const projectList = await request("/api/projects");
    if (projectList.status !== 200 || !projectList.payload?.projects?.some((item: { id: string }) => item.id === createdProjectId)) {
      throw new Error(`Project listing failed: ${projectList.status}`);
    }
    const projectPage = await request(`/projects/${createdProjectId}`);
    if (projectPage.status !== 200) throw new Error(`Project detail page failed: ${projectPage.status}`);
    const changedProject = await request(`/api/projects/${createdProjectId}`, { ...projectData, status: "active" }, "PATCH");
    if (changedProject.status !== 200 || changedProject.payload?.project?.status !== "active") {
      throw new Error(`Project update failed: ${changedProject.status}`);
    }
    const editedProject = await request(`/api/projects/${createdProjectId}`, { ...projectData, status: "active", objective: "Objetivo actualizado en otra sesión" }, "PATCH");
    if (editedProject.status !== 200) throw new Error(`Project edit before status change failed: ${editedProject.status}`);
    const changedStatus = await request(`/api/projects/${createdProjectId}/status`, { status: "paused", expectedStatus: "active" }, "PATCH");
    if (changedStatus.status !== 200 || changedStatus.payload?.project?.status !== "paused" || changedStatus.payload.project.objective !== "Objetivo actualizado en otra sesión") {
      throw new Error("Status-only update changed other project fields");
    }
    const staleStatus = await request(`/api/projects/${createdProjectId}/status`, { status: "completed", expectedStatus: "active" }, "PATCH");
    if (staleStatus.status !== 409 || staleStatus.payload?.currentStatus !== "paused") {
      throw new Error(`Stale status update should be rejected with the current status, got ${staleStatus.status}`);
    }
    const projectEvents = await db.select().from(projectAuditEvent).where(eq(projectAuditEvent.projectId, createdProjectId));
    if (!projectEvents.some((item) => item.action === "project.created") || !projectEvents.some((item) => item.action === "project.updated")) {
      throw new Error("Project changes were not audited");
    }
    const repeatedKey = randomUUID();
    const [firstUpload, repeatedUpload] = await Promise.all([uploadDocument(createdProjectId, repeatedKey), uploadDocument(createdProjectId, repeatedKey)]);
    if (![firstUpload.status, repeatedUpload.status].sort().every((status, index) => status === [200, 201][index]) ||
      firstUpload.payload?.document?.id !== repeatedUpload.payload?.document?.id || firstUpload.payload?.document?.version !== 1) {
      throw new Error("Repeated document upload should create only one first version");
    }
    const [secondUpload, thirdUpload] = await Promise.all([uploadDocument(createdProjectId, randomUUID()), uploadDocument(createdProjectId, randomUUID())]);
    const versions = [secondUpload.payload?.document?.version, thirdUpload.payload?.document?.version].sort();
    if (secondUpload.status !== 201 || thirdUpload.status !== 201 || versions[0] !== 2 || versions[1] !== 3) {
      throw new Error("Concurrent document uploads should receive different consecutive versions");
    }

    const companyB = await request("/api/companies", { name: "Empresa B de prueba" });
    if (companyB.status !== 201 || typeof companyB.payload?.company?.id !== "string") {
      throw new Error(`Company B creation failed: ${companyB.status}`);
    }
    const companyBId: string = companyB.payload.company.id;
    companyIds.push(companyBId);
    const companyBProjects = await request("/api/projects");
    if (companyBProjects.status !== 200 || companyBProjects.payload?.projects?.length !== 0) {
      throw new Error("Company B can see company A projects");
    }
    const crossCompanyDetail = await request(`/api/projects/${createdProjectId}`);
    if (crossCompanyDetail.status !== 404) throw new Error(`Cross-company detail should be 404, got ${crossCompanyDetail.status}`);
    const crossCompanyUpdate = await request(`/api/projects/${createdProjectId}`, projectData, "PATCH");
    if (crossCompanyUpdate.status !== 404) throw new Error(`Cross-company update should be 404, got ${crossCompanyUpdate.status}`);
    const createdInB = await request("/api/projects", { ...projectData, name: "Proyecto de empresa B" });
    if (createdInB.status !== 201 || typeof createdInB.payload?.project?.id !== "string") {
      throw new Error(`Company B project creation failed: ${createdInB.status}`);
    }
    const companyBProjectId: string = createdInB.payload.project.id;
    projectIds.push(companyBProjectId);
    if (createdInB.payload.project.companyId !== companyBId) throw new Error("Project was not assigned to company B");
    const switchedToA = await request("/api/companies/active", { companyId: companyAId });
    if (switchedToA.status !== 200) throw new Error(`Company switch failed: ${switchedToA.status}`);
    const companyAProjects = await request("/api/projects");
    if (companyAProjects.status !== 200 || companyAProjects.payload?.projects?.length !== 1 || companyAProjects.payload.projects[0].id !== createdProjectId) {
      throw new Error("Company A project list is not isolated");
    }
    const crossCompanyPage = await request(`/projects/${companyBProjectId}`);
    if (crossCompanyPage.status !== 404) throw new Error(`Cross-company page should be 404, got ${crossCompanyPage.status}`);
    const unauthorizedSwitch = await request("/api/companies/active", { companyId: randomUUID() });
    if (unauthorizedSwitch.status !== 403) throw new Error(`Unassigned company switch should be 403, got ${unauthorizedSwitch.status}`);
    const deactivatedCompany = await request(`/api/companies/${companyAId}`, { name: "Empresa A de prueba", isActive: false }, "PATCH");
    if (deactivatedCompany.status !== 200) throw new Error(`Company deactivation failed: ${deactivatedCompany.status}`);
    const inactiveProjects = await request("/api/projects");
    if (inactiveProjects.status !== 200 || !inactiveProjects.payload?.projects?.some((item: { id: string }) => item.id === createdProjectId)) {
      throw new Error(`Inactive company projects should remain readable, got ${inactiveProjects.status}`);
    }
    const inactiveProjectsPage = await request("/projects");
    const inactiveProjectDetail = await request(`/projects/${createdProjectId}`);
    if (inactiveProjectsPage.status !== 200 || inactiveProjectDetail.status !== 200) {
      throw new Error("Inactive company project pages should remain readable");
    }
    const inactiveUpdate = await request(`/api/projects/${createdProjectId}/status`, { status: "completed", expectedStatus: "paused" }, "PATCH");
    if (inactiveUpdate.status !== 403) throw new Error(`Inactive company project update should be blocked, got ${inactiveUpdate.status}`);
    const inactiveMemberUpdate = await request(`/api/companies/${companyAId}/members/${adminId}`, { visibleInActivityAssignments: true }, "PATCH");
    if (inactiveMemberUpdate.status !== 403) throw new Error(`Inactive company member update should be blocked, got ${inactiveMemberUpdate.status}`);
    const inactiveCompanyEdit = await request(`/api/companies/${companyAId}`, { name: "Nombre no permitido", isActive: true }, "PATCH");
    if (inactiveCompanyEdit.status !== 403) throw new Error(`Inactive company edit should be blocked, got ${inactiveCompanyEdit.status}`);
    const inactiveSwitch = await request("/api/companies/active", { companyId: companyAId });
    if (inactiveSwitch.status !== 403) throw new Error(`Inactive company should not be selectable, got ${inactiveSwitch.status}`);
    const reactivatedCompany = await request(`/api/companies/${companyAId}`, { isActive: true }, "PATCH");
    if (reactivatedCompany.status !== 200) throw new Error(`Company reactivation failed: ${reactivatedCompany.status}`);

    const childPassword = randomBytes(24).toString("hex");
    const created = await request("/api/auth/admin/create-user", {
      name: "Temporary user",
      email: childEmail,
      password: childPassword,
      role: "user",
    });
    if (created.status !== 200) throw new Error(`Admin user creation failed: ${created.status}`);
    const child = await db.query.user.findFirst({ where: eq(user.email, childEmail) });
    if (!child) throw new Error("Created user was not found in PostgreSQL");

    const adminCookies = new Map(cookieJar);
    cookieJar.clear();
    const childLogin = await request("/api/auth/sign-in/email", { email: childEmail, password: childPassword });
    if (childLogin.status !== 200) throw new Error(`Ordinary user sign-in failed: ${childLogin.status}`);
    const ordinaryAdminAccess = await request("/api/auth/admin/list-users");
    if (ordinaryAdminAccess.status !== 403) throw new Error(`Ordinary user should not manage users: ${ordinaryAdminAccess.status}`);
    const ordinaryPage = await request("/users");
    if (ordinaryPage.status !== 307) throw new Error(`Ordinary user should be redirected from /users: ${ordinaryPage.status}`);
    const ordinaryProjectAccess = await request("/api/projects");
    if (ordinaryProjectAccess.status !== 403) throw new Error(`Ordinary user should not list projects: ${ordinaryProjectAccess.status}`);
    const ordinaryProjectPage = await request("/projects");
    if (ordinaryProjectPage.status !== 307) throw new Error(`Ordinary user should be redirected from /projects: ${ordinaryProjectPage.status}`);
    const ordinarySwitch = await request("/api/companies/active", { companyId: companyAId });
    if (ordinarySwitch.status !== 403) throw new Error(`Ordinary user should not switch to unassigned company: ${ordinarySwitch.status}`);
    const childCookies = new Map(cookieJar);
    cookieJar.clear();
    for (const [key, value] of adminCookies) cookieJar.set(key, value);

    const banned = await request("/api/auth/admin/ban-user", { userId: child.id });
    if (banned.status !== 200) throw new Error(`User deactivation failed: ${banned.status}`);
    const deactivated = await db.query.user.findFirst({ where: eq(user.id, child.id) });
    if (!deactivated?.banned) throw new Error("User was not deactivated in PostgreSQL");
    cookieJar.clear();
    for (const [key, value] of childCookies) cookieJar.set(key, value);
    const revoked = await request("/api/auth/get-session");
    if (revoked.payload?.session) throw new Error("Deactivated user's session was not revoked");
    cookieJar.clear();
    for (const [key, value] of adminCookies) cookieJar.set(key, value);

    const directChange = await request("/api/auth/change-password", { currentPassword: password, newPassword: randomBytes(24).toString("hex") });
    if (directChange.status !== 403) throw new Error(`Direct password change should be 403, got ${directChange.status}`);

    const newPassword = randomBytes(24).toString("hex");
    const changed = await request("/api/security/change-password", { currentPassword: password, newPassword, totpCode: totp(uri) });
    if (changed.status !== 200) throw new Error(`Protected password change failed: ${changed.status}`);
    const credential = await db.query.account.findFirst({ where: eq(account.userId, adminId) });
    if (!credential?.password || !(await verifyPassword({ hash: credential.password, password: newPassword }))) {
      throw new Error("New password was not stored by Better Auth");
    }

    await request("/api/auth/sign-out", {});
    cookieJar.clear();
    const challenge = await request("/api/auth/sign-in/email", { email, password: newPassword });
    if (challenge.status !== 200 || challenge.payload?.twoFactorRedirect !== true) {
      throw new Error("Sign-in did not require a second factor after enrollment");
    }
    const pendingSession = await request("/api/auth/get-session");
    if (pendingSession.payload?.session) throw new Error("A session was issued before the second factor");
    const verifiedLogin = await request("/api/auth/two-factor/verify-totp", { code: totp(uri) });
    if (verifiedLogin.status !== 200) throw new Error(`Second-factor sign-in failed: ${verifiedLogin.status}`);
    const finalAccess = await request("/api/auth/admin/list-users");
    if (finalAccess.status !== 200) throw new Error(`Admin access after two-factor sign-in failed: ${finalAccess.status}`);

    const audit = await db.query.securityEvent.findMany({ where: eq(securityEvent.actorUserId, adminId) });
    if (!audit.some((item) => item.action === "admin.ban-user.completed") || !audit.some((item) => item.action === "password.change.completed")) {
      throw new Error("Sensitive actions were not recorded in the security audit");
    }

    console.log("Authentication, TOTP, users, company isolation, projects, concurrent document uploads and audits verified with disposable local data.");
  } finally {
    for (const id of projectIds) {
      await db.delete(projectAuditEvent).where(eq(projectAuditEvent.projectId, id));
      await db.delete(projectDocument).where(eq(projectDocument.projectId, id));
      await db.delete(project).where(eq(project.id, id));
    }
    for (const id of companyIds) {
      await db.delete(auditEvent).where(eq(auditEvent.companyId, id));
      await db.delete(companyTeamMember).where(eq(companyTeamMember.companyId, id));
      await db.delete(companyMember).where(eq(companyMember.companyId, id));
      await db.delete(company).where(eq(company.id, id));
    }
    const child = await db.query.user.findFirst({ where: eq(user.email, childEmail) });
    if (child) await db.delete(securityEvent).where(eq(securityEvent.actorUserId, child.id));
    await db.delete(securityEvent).where(eq(securityEvent.actorUserId, adminId));
    await db.delete(user).where(eq(user.email, childEmail));
    await db.delete(user).where(eq(user.id, adminId));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
