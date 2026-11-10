import { requireAdmin } from "@/lib/require-session";
import { getCalendarSyncMode } from "@/modules/calendar/instance-config";
import { ModuleHeader } from "../../module-layout";
import { CalendarIntegrationSettings } from "./settings-panel";

export default async function CalendarIntegrationPage() {
  await requireAdmin();
  const syncMode = await getCalendarSyncMode();
  return <main className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8">
    <ModuleHeader title="Integración de calendarios" description="Controla si esta instalación consulta Google Calendar y Microsoft Outlook." />
    <CalendarIntegrationSettings initialSyncMode={syncMode} />
  </main>;
}
