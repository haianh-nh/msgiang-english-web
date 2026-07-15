export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return Response.json(
    {
      ok: true,
      build: "20phase7g-tuition-evaluation-api-fast",
      phase: "7g-tuition-evaluation-api-fast",
      realtimeFrontend: true,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Msgiang-Build": "20phase7g-tuition-evaluation-api-fast",
      },
    },
  );
}
