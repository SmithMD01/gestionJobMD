"use client";

import { useState } from "react";
import type { ProjectContact } from "./project-contacts";
import { ProjectActivities, type ProjectActivity } from "./project-activities";
import { ProjectDevelopment } from "./project-development";
import { ProjectSchedule, type ProjectScheduleItem as ProjectScheduleItemType, type ProjectSchedule as ProjectScheduleType } from "./project-schedule";
import { ProjectFollowUp } from "./project-follow-up";
import type { ProjectModule } from "./project-modules";
import { ProjectConfiguration } from "./project-configuration";
import { ProjectDocumentation, type ProjectDocument } from "./project-documentation";
import { formatProjectDate } from "@/modules/projects/constants";
import { Button } from "@/components/ui/button";

const sections = [
  { id: "information", label: "Información proyecto" },
  { id: "activities", label: "Actividades" },
  { id: "development", label: "Desarrollo" },
  { id: "configuration", label: "Configuración proyecto" },
  { id: "documentation", label: "Documentación" },
  { id: "qa", label: "Pruebas QA" },
  { id: "schedule", label: "Cronograma" },
  { id: "benchwork", label: "Benchwork" },
] as const;

function ComingSoon({ children }: { children: string }) {
  return <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-5"><p className="text-sm leading-6 text-muted">{children}</p></div>;
}

export function ProjectSections({ projectId, contacts, activities, developmentStages, teamMembers, modules, documents, projectObjective, projectDescription, projectCreatedAt, projectUpdatedAt, projectStatus, schedule, scheduleItems, projectStartDate, projectEndDate }: { projectId: string; contacts: ProjectContact[]; activities: ProjectActivity[]; developmentStages: { id: string; name: string; color: string }[]; teamMembers: { id: string; name: string; role: string | null }[]; modules: ProjectModule[]; documents: ProjectDocument[]; projectObjective: string; projectDescription: string; projectCreatedAt: Date; projectUpdatedAt: Date; projectStatus: "planned" | "active" | "paused" | "completed" | "cancelled"; schedule: ProjectScheduleType | null; scheduleItems: ProjectScheduleItemType[]; projectStartDate: string | null; projectEndDate: string | null }) {
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("information");
  const [projectModules, setProjectModules] = useState(modules);

  return (
    <section className="mt-6" aria-label="Secciones del proyecto">
      <div role="tablist" aria-label="Secciones del proyecto" onKeyDown={(event) => {
        const currentIndex = sections.findIndex((section) => section.id === active);
        const nextIndex = event.key === "ArrowRight" ? (currentIndex + 1) % sections.length
          : event.key === "ArrowLeft" ? (currentIndex - 1 + sections.length) % sections.length
            : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : -1;
        if (nextIndex >= 0) {
          event.preventDefault();
          const next = sections[nextIndex];
          setActive(next.id);
          document.getElementById(`project-tab-${next.id}`)?.focus();
        }
      }} className="grid grid-cols-2 gap-2 pb-1 sm:grid-cols-4 xl:grid-cols-8">
        {sections.map((section) => <Button
          key={section.id}
          variant={active === section.id ? "primary" : "secondary"}
          size="compact"
          id={`project-tab-${section.id}`}
          type="button"
          role="tab"
          aria-selected={active === section.id}
          aria-controls={`project-panel-${section.id}`}
          tabIndex={active === section.id ? 0 : -1}
          onClick={() => setActive(section.id)}
          className="w-full min-w-0 rounded-lg px-2 text-xs font-medium"
        >{section.label}</Button>)}
      </div>

      {sections.map((section) => <div key={section.id} id={`project-panel-${section.id}`} role="tabpanel" aria-labelledby={`project-tab-${section.id}`} tabIndex={0} hidden={active !== section.id} className="mt-3 rounded-xl border border-line bg-surface p-5 sm:p-6">
        {section.id === "information" && <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
            <section aria-labelledby="project-summary" className="rounded-xl border border-line bg-canvas p-5 sm:p-6"><h2 id="project-summary" className="text-base font-semibold">Objetivo y descripción</h2><dl className="mt-4 space-y-4"><div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Objetivo</dt><dd className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-ink">{projectObjective}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Descripción</dt><dd className={`mt-1.5 whitespace-pre-wrap text-xs leading-5 ${projectDescription ? "text-ink" : "text-muted"}`}>{projectDescription || "Aún no se ha añadido una descripción."}</dd></div></dl></section>
            <section aria-labelledby="project-details" className="rounded-xl border border-line bg-canvas p-5 sm:p-6"><h2 id="project-details" className="text-base font-semibold">Datos del proyecto</h2><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4"><div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Fecha de inicio</dt><dd className="mt-1 text-xs text-ink">{formatProjectDate(projectStartDate)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Fin previsto</dt><dd className="mt-1 text-xs text-ink">{formatProjectDate(projectEndDate)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Creado el</dt><dd className="mt-1 text-xs text-ink">{projectCreatedAt.toLocaleDateString("es-PE")}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-subtle">Última actualización</dt><dd className="mt-1 text-xs text-ink">{projectUpdatedAt.toLocaleDateString("es-PE")}</dd></div></dl></section>
          </div>
          <ProjectFollowUp activities={activities} scheduleItems={scheduleItems} stages={developmentStages} modules={projectModules} projectStatus={projectStatus} startDate={projectStartDate} endDate={projectEndDate} />
        </>}
        {section.id === "activities" && <ProjectActivities projectId={projectId} initialActivities={activities} stages={developmentStages} teamMembers={teamMembers} />}
        {section.id === "development" && <ProjectDevelopment projectId={projectId} activities={activities} stages={developmentStages} teamMembers={teamMembers} modules={projectModules} />}
        {section.id === "configuration" && <ProjectConfiguration projectId={projectId} contacts={contacts} modules={projectModules} activities={activities} stages={developmentStages} onModulesChange={setProjectModules} />}
        {section.id === "documentation" && <ProjectDocumentation projectId={projectId} initialDocuments={documents} />}
        {section.id === "qa" && <>
          <h2 className="text-base font-semibold">Pruebas QA</h2>
          <p className="mt-2 text-sm text-muted">Casos de prueba, resultados y evidencias vinculados al proyecto.</p>
          <div className="mt-4"><ComingSoon>La estructura de esta sección se definirá al revisar tu archivo de QA.</ComingSoon></div>
        </>}
        {section.id === "schedule" && <ProjectSchedule projectId={projectId} initialSchedule={schedule} initialItems={scheduleItems} />}
        {section.id === "benchwork" && <>
          <h2 className="text-base font-semibold">Benchwork</h2>
          <p className="mt-2 text-sm text-muted">Espacio de apoyo para preparar documentación con IA a partir de la información del proyecto.</p>
          <div className="mt-4"><ComingSoon>La generación asistida quedará sujeta a revisión y aprobación humana.</ComingSoon></div>
        </>}
      </div>)}
    </section>
  );
}
