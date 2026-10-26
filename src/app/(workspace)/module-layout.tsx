import type { ReactNode } from "react";

export function ModuleHeader({ title, description, action }: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-4xl text-muted">{description}</p>
        </div>
        {action}
      </header>
    </>
  );
}

export function ModuleToolbar({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex flex-wrap items-end gap-3">{children}</div>;
}
