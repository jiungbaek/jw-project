import { getSeasonResult } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getSeasonResult();
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "계절 판정에 실패했습니다." },
      { status: 502 }
    );
  }
}
