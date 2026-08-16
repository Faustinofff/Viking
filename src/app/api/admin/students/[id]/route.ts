import { NextRequest, NextResponse } from "next/server";
import { loadStudentDetail } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }
    const data = await loadStudentDetail(id);
    if (!data) {
      return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
