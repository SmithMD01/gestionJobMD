import type { ReactNode } from "react";

export type IconName = "menu" | "panelClose" | "panelOpen" | "home" | "projects" | "companies" | "users" | "audit" | "roles" | "settings" | "calendar" | "star" | "sessions" | "password" | "shield" | "sun" | "moon" | "logout" | "bell" | "chevronDown" | "more";

const drawings: Record<IconName, ReactNode> = {
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  panelClose: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M16 9l-3 3 3 3" /></>,
  panelOpen: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16m4-11 3 3-3 3" /></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-8h6v8" /></>,
  projects: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M3 10h18" /></>,
  companies: <><path d="M4 21V7l8-4 8 4v14M2 21h20M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2H3ZM17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5" /></>,
  audit: <><path d="M5 4h14v17H5z" /><path d="M8 8h8M8 12h8M8 16h5" /><path d="M9 2h6v4H9z" /></>,
  roles: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Z" /><path d="m17 12 1.2 1.2 2.8-2.8M17 16h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1A7 7 0 0 1 7.5 13l-1.8-.5v-2.8l1.8-.3a8 8 0 0 1 .8-1.6l-.7-1.6L10 4.8l1.2 1.4a8 8 0 0 1 1.8 0l1.2-1.4 2.4 1.4-.7 1.6a8 8 0 0 1 .8 1.6l1.8.3v2.8l-1.8.5a7 7 0 0 1-.1 2Z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
  star: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
  sessions: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  password: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <><path d="M20.4 15.5A8.5 8.5 0 0 1 8.5 3.6 8.5 8.5 0 1 0 20.4 15.5Z" /></>,
  logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m4-4 4-4-4-4m4 4H9" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
  chevronDown: <><path d="m6 9 6 6 6-6" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
};

export function UiIcon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {drawings[name]}
    </svg>
  );
}
