"use client";

import { useState } from "react";
import { ProjectContacts, type ProjectContact } from "./project-contacts";

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

export function ProjectSections({ projectId, contacts }: { projectId: string; contacts: ProjectContact[] }) {
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
          className={`min-h-9 w-full min-w-0 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ink ${active === section.id ? "border-ink bg-ink text-on-primary" : "border-line bg-surface text-muted hover:bg-hover hover:text-ink"}`}
        >{section.label}</button>)}
      </div>

      {sections.map((section) => <div key={section.id} id={`project-panel-${section.id}`} role="tabpanel" aria-labelledby={`project-tab-${section.id}`} tabIndex={0} hidden={active !== section.id} className="mt-3 rounded-xl border border-line bg-surface p-5 sm:p-6">
        {section.id === "additional" && <>
          <ProjectContacts projectId={projectId} initialContacts={contacts} />
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-semibold">Resumen de actividades</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["Total", "—"], ["Activas", "—"], ["Finalizadas", "—"], ["Horas", "—"]].map(([label, value]) => <div key={label} className="rounded-lg bg-canvas px-3 py-2.5"><p className="text-[11px] text-subtle">{label}</p><p className="mt-1 text-base font-semibold tabular-nums text-ink">{value}</p></div>)}
            </div>
            <p className="mt-2 text-xs text-subtle">El resumen se calculará cuando se registren actividades y horas.</p>
          </div>
        </>}
        {section.id === "activities" && <>
          <h2 className="text-base font-semibold">Actividades</h2>
          <p className="mt-2 text-sm text-muted">Reuniones, coordinaciones, acuerdos y tareas de seguimiento relacionadas con el proyecto.</p>
          <div className="mt-4"><ComingSoon>El registro de actividades estará disponible en la siguiente fase.</ComingSoon></div>
        </>}
        {section.id === "development" && <>
          <h2 className="text-base font-semibold">Desarrollo</h2>
          <p className="mt-2 text-sm text-muted">Actividades relacionadas con programación y trabajo técnico del proyecto.</p>
          <div className="mt-4"><ComingSoon>Las actividades de desarrollo se mostrarán aquí cuando exista su registro.</ComingSoon></div>
        </>}
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
        {section.id === "schedule" && <>
          <h2 className="text-base font-semibold">Cronograma</h2>
          <p className="mt-2 text-sm text-muted">Planificación del proyecto para crear manualmente o adjuntar y visualizar cuando esté lista.</p>
          <div className="mt-4"><ComingSoon>La edición y visualización del cronograma están pendientes.</ComingSoon></div>
        </>}
        {section.id === "benchwork" && <>
          <h2 className="text-base font-semibold">Benchwork</h2>
          <p className="mt-2 text-sm text-muted">Espacio de apoyo para preparar documentación con IA a partir de la información del proyecto.</p>
          <div className="mt-4"><ComingSoon>La generación asistida quedará sujeta a revisión y aprobación humana.</ComingSoon></div>
        </>}
      </div>)}
    </section>
  );
}
