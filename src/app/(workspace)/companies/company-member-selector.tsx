
"use client";

export type AssignableUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
};

export type CompanyMember = AssignableUser & {
  visibleInActivityAssignments: boolean;
};

export function CompanyMemberSelector({ users, selectedIds, currentUserId, onChange }: {
  users: AssignableUser[];
  selectedIds: string[];
  currentUserId: string;
  onChange: (ids: string[]) => void;
}) {
  function toggle(userId: string) {
    if (userId === currentUserId) return;
    onChange(selectedIds.includes(userId) ? selectedIds.filter((id) => id !== userId) : [...selectedIds, userId]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Usuarios asignados</legend>
      <p className="text-xs text-muted">Selecciona los usuarios que podrán ver esta empresa. El administrador actual se mantiene asignado.</p>
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
        {users.length === 0 ? <p className="px-2 py-2 text-sm text-muted">No hay usuarios registrados.</p> : users.map((user) => {
          const selected = selectedIds.includes(user.id);
          const isCurrentUser = user.id === currentUserId;
          return (
            <label key={user.id} className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${isCurrentUser ? "bg-note" : "hover:bg-hover"}`}>
              <input type="checkbox" checked={selected || isCurrentUser} disabled={isCurrentUser} onChange={() => toggle(user.id)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{user.name}{isCurrentUser ? " (tú)" : ""}</span>
                <span className="block truncate text-xs text-muted">{user.email}{user.role === "admin" ? " · Administrador" : ""}{user.banned ? " · Desactivado" : ""}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
