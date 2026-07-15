export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    {
      ok: true,
      build: "20phase8-student-transfer-schedule-attendance",
      phase: "7l1-smart-warmup-fast-tabs",
      realtimeFrontend: true,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Msgiang-Build": "20phase8-student-transfer-schedule-attendance",
      },
    },
  );
}
