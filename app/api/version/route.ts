export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    {
      ok: true,
      build: "20phase8d4-5-staff-main-class-cards",
      phase: "8d4-5-staff-main-class-cards",
      realtimeFrontend: true,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Msgiang-Build": "20phase8d4-5-staff-main-class-cards",
      },
    },
  );
}
