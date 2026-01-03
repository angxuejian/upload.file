import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const META_DIR = path.join(process.cwd(), "uploads/meta");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get("hash");

  if (!hash) {
    return NextResponse.json({ error: "hash is required" }, { status: 400 });
  }

  await fs.mkdir(META_DIR, { recursive: true });

  const metaPath = path.join(META_DIR, hash + ".json");

  try {
    const meta = await fs.readFile(metaPath, "utf-8");
    return NextResponse.json({
      exists: true,
      code: 200,
      data: JSON.parse(meta)
    });
  } catch {
    return NextResponse.json({ exists: false, code: 200, data: null });
  }
}
