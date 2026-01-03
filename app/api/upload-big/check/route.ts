import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CHUNK_DIR = path.join(process.cwd(), "uploads/chunks");
const META_DIR = path.join(process.cwd(), "uploads/meta");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get("hash");

  if (!hash) {
    return NextResponse.json({ error: "hash is required" }, { status: 400 });
  }

  const metaPath = path.join(META_DIR, hash + ".json");

  try {
    const meta = await fs.readFile(metaPath, "utf-8");
    return NextResponse.json({
      exists: true,
      code: 200,
      data: JSON.parse(meta),
    });
  } catch {}

  const chunkDir = path.join(CHUNK_DIR, hash);
  let uploaded: number[] = [];
  try {
    const files = await fs.readdir(chunkDir);
    uploaded = files.map(Number);
  } catch {}

  return NextResponse.json({
    exists: false,
    uploadedChunks: uploaded,
    code: 200,
    data: null,
  });
}
