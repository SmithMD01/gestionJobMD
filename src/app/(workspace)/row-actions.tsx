"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { UiIcon } from "../ui-icon";

export type RowAction = {
  label: string;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
};

export function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = Math.min(actions.length * 44 + 8, window.innerHeight - 24);
    const below = window.innerHeight - rect.bottom;
    setPosition({
      top: below >= menuHeight + 8 || rect.top < menuHeight + 8 ? rect.bottom + 6 : rect.top - menuHeight - 6,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, [actions.length]);

  useEffect(() => {
    if (!open) return;
    positionMenu();
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus());
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open, positionMenu]);

  function navigateMenu(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]"));
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  const menu = open && position && typeof document !== "undefined" ? createPortal(
    <div ref={menuRef} onKeyDown={navigateMenu} className="ui-row-actions" style={{ top: position.top, right: position.right }} role="menu" aria-label={`Opciones de ${label}`}>
      {actions.map((action) => action.href ? (
        <Link key={action.label} role="menuitem" href={action.href} onClick={() => setOpen(false)} className={`ui-row-action ${action.tone === "danger" ? "ui-row-action-danger" : ""}`}>{action.label}</Link>
      ) : (
        <button key={action.label} role="menuitem" type="button" onClick={() => { setOpen(false); action.onSelect?.(); }} className={`ui-row-action ${action.tone === "danger" ? "ui-row-action-danger" : ""}`}>{action.label}</button>
      ))}
    </div>, document.body,
  ) : null;

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button ref={triggerRef} type="button" aria-label={`Acciones de ${label}`} aria-expanded={open} aria-haspopup="menu" onClick={() => { if (!open) positionMenu(); setOpen((value) => !value); }} className="ui-icon-button">
        <UiIcon name="more" />
      </button>
      {menu}
    </div>
  );
}
