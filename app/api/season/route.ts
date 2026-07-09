import { getSeasonResult } from "@/lib/season";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getSeasonResult();
    return Response.json(result);
  } catch (error) {
    console.error("[api/season]", error);
    return Response.json({ error: true }, { status: 502 });
  }
}
