export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    {
      ok: true,
      build: "20phase8d4-8-cross-month-makeup-backlog",
      phase: "8d4-8-cross-month-makeup-backlog",
      realtimeFrontend: true,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Msgiang-Build": "20phase8d4-8-cross-month-makeup-backlog",
      },
    },
  );
}
