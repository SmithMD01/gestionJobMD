import { POST as syncCalendar } from "../google/sync/route";

export async function POST(request: Request) {
  return syncCalendar(request);
}
