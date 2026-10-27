"use client";

import { useState } from "react";
import { UiIcon } from "../ui-icon";
import { SignOutButton } from "./dashboard/sign-out-button";
import { Button } from "@/components/ui/button";

export function UserProfile({ name, email, collapsed }: { name: string; email: string; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";

  return (
    <div className="relative">
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Cuenta de ${name}`}
        aria-expanded={open}
        aria-controls="sidebar-user-menu"
        className={`w-full justify-start gap-2 rounded-lg p-1.5 text-left ${collapsed ? "md:justify-center" : ""}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hover text-xs font-semibold text-ink">{initials}</span>
        {!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">{name}</span><span className="block truncate text-[11px] text-muted">{email}</span></span><UiIcon name="chevronDown" className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} /></>}
      </Button>
      {open && <div id="sidebar-user-menu" className={`absolute z-30 w-56 rounded-xl border border-line bg-surface p-1 shadow-lg ${collapsed ? "bottom-full left-0 mb-2 md:bottom-0 md:left-full md:mb-0 md:ml-2" : "bottom-full left-0 mb-2"}`}>
        <SignOutButton />
      </div>}
    </div>
  );
}
