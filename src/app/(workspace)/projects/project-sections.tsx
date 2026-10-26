"use client";

import { useState } from "react";
import { ProjectContacts, type ProjectContact } from "./project-contacts";
import { ProjectActivities, type ProjectActivity } from "./project-activities";
import { ProjectDevelopment } from "./project-development";
import { ProjectSchedule, type ProjectScheduleItem as ProjectScheduleItemType, type ProjectSchedule as ProjectScheduleType } from "./project-schedule";
import { ProjectFollowUp } from "./project-follow-up";

const sections = [
  { id: "additional", label: "Datos adicionales" },
  { id: "activities", label: "Actividades" },
  { id: "development", label: "Desarrollo" },
  { id: "documentation", label: "Documentación" },
  { id: "qa", label: "Pruebas QA" },
  { id: "schedule", label: "Cronograma" },
  { id: "benchwork", label: "Benchwork" },
] as const;

function ComingSoon({ children }: { children: string }) {
  return <div className="rounded-lg border border-dashed border-line bg-canvas px-4 py-5"><p className="text-sm leading-6 text-muted">{children}</p></div>;
}

export function ProjectSections({ projectId, contacts, activities, developmentStages, teamMembers, schedule, scheduleItems, projectStartDate, projectEndDate }: { projectId: string; contacts: ProjectContact[]; activities: ProjectActivity[]; developmentStages: { id: string; name: string; color: string }[]; teamMembers: { id: string; name: string; role: string | null }[]; schedule: ProjectScheduleType | null; scheduleItems: ProjectScheduleItemType[]; projectStartDate: string | null; projectEndDate: string | null }) {
  const [active, setActive] = useState<(typeof sections)[number]["id"]>("additional");

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
      }} className="grid grid-cols-2 gap-2 pb-1 sm:grid-cols-4 lg:grid-cols-7">
        {sections.map((section) => <button
          key={section.id}
          id={`project-tab-${section.id}`}
          type="button"
          role="tab"
          aria-selected={active === section.id}
          aria-controls={`project-panel-${section.id}`}
          tabIndex={active === section.id ? 0 : -1}
          onClick={() => setActive(section.id)}
          className={`min-h-8 w-full min-w-0 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ink ${active === section.id ? "border-ink bg-ink text-on-primary" : "border-line bg-surface text-muted hover:bg-hover hover:text-ink"}`}
        >{section.label}</button>)}
      </div>

      {sections.map((section) => <div key={section.id} id={`project-panel-${section.id}`} role="tabpanel" aria-labelledby={`project-tab-${section.id}`} tabIndex={0} hidden={active !== section.id} className="mt-3 rounded-xl border border-line bg-surface p-5 sm:p-6">
        {section.id === "additional" && <>
          <ProjectContacts projectId={projectId} initialContacts={contacts} />
          <ProjectFollowUp activities={activities} scheduleItems={scheduleItems} stages={developmentStages} startDate={projectStartDate} endDate={projectEndDate} />
        </>}
        {section.id === "activities" && <ProjectActivities projectId={projectId} initialActivities={activities} stages={developmentStages} teamMembers={teamMembers} />}
        {section.id === "development" && <ProjectDevelopment projectId={projectId} activities={activities} stages={developmentStages} teamMembers={teamMembers} />}
        {section.id === "documentation" && <>
          <h2 className="text-base font-semibold">Documentación</h2>
          <p className="mt-2 text-sm text-muted">Documentos asociados, transcripciones, versiones y revisiones.</p>
          <div className="mt-4"><ComingSoon>Aún no hay documentos ni transcripciones asociados.</ComingSoon></div>
        </>}
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
