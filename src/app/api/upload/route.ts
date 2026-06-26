import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "IMGBB_API_KEY が設定されていません" }, { status: 500 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const body = new URLSearchParams();
    body.append("key", apiKey);
    body.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message ?? "imgBB アップロード失敗");
    }

    return NextResponse.json({ url: data.data.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
