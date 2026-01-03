import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CHUNK_DIR = path.join(process.cwd(), "uploads/chunks");

export async function POST(req: Request) {
  const formData = await req.formData();
  
  const chunk = formData.get("chunk") as File;
  const hash = formData.get("hash") as string;
  const index = formData.get("index") as string;
 
  // const dir = path.join(CHUNK_DIR, filehash, hash);
  const dir = path.join(CHUNK_DIR, hash);
  await fs.mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await chunk.arrayBuffer());
  await fs.writeFile(path.join(dir, index), buffer);

  return NextResponse.json({ success: true, code: 200, hash: hash });
}
