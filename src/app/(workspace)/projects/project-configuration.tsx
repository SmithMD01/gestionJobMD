"use client";

import { ProjectContacts, type ProjectContact } from "./project-contacts";
import { ProjectModules, type ProjectModule } from "./project-modules";
import type { ProjectActivity } from "./project-activities";

export function ProjectConfiguration({ projectId, contacts, modules, activities, stages, onModulesChange }: { projectId: string; contacts: ProjectContact[]; modules: ProjectModule[]; activities: ProjectActivity[]; stages: { id: string; name: string; color: string }[]; onModulesChange: (modules: ProjectModule[]) => void }) {
  return <div className="space-y-4">
    <ProjectContacts projectId={projectId} initialContacts={contacts} />
    <details open className="group/module-config rounded-lg border border-line bg-canvas">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span>Gestión de módulos <span className="ml-1 text-xs font-normal text-subtle">({modules.length})</span></span>
        <span aria-hidden="true" className="text-xs text-muted transition-transform group-open/module-config:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-line px-3 pt-1"><ProjectModules projectId={projectId} initialModules={modules} activities={activities} stages={stages} onModulesChange={onModulesChange} /></div>
    </details>
  </div>;
}
