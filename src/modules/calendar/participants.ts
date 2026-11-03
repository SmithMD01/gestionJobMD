export type CalendarParticipant = {
  name: string | null;
  email: string | null;
  responseStatus: string | null;
  organizer: boolean;
};

export function parseCalendarParticipants(value: string | null | undefined): CalendarParticipant[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): CalendarParticipant[] => {
      if (!item || typeof item !== "object") return [];
      const participant = item as Partial<CalendarParticipant>;
      const name = typeof participant.name === "string" ? participant.name : null;
      const email = typeof participant.email === "string" ? participant.email : null;
      if (!name && !email) return [];
      return [{
        name,
        email,
        responseStatus: typeof participant.responseStatus === "string" ? participant.responseStatus : null,
        organizer: participant.organizer === true,
      }];
    });
  } catch {
    return [];
  }
}
