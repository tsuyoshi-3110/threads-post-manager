import { NextRequest, NextResponse } from "next/server";
import { generateThreadsPost } from "@/lib/openai/client";
import { GenerateRequest, GenerateResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { prompt, brandName, brandDescription, tone } = body;

    if (!prompt || !brandName) {
      return NextResponse.json(
        { error: "prompt と brandName は必須です" },
        { status: 400 }
      );
    }

    const content = await generateThreadsPost(prompt, brandName, tone, brandDescription);
    return NextResponse.json({ content } satisfies GenerateResponse);
  } catch (e) {
    console.error("Generate error:", e);
    return NextResponse.json(
      { error: "文章生成に失敗しました" },
      { status: 500 }
    );
  }
}
