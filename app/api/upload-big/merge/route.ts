import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CHUNK_DIR = path.join(process.cwd(), "uploads/chunks");
const FILE_DIR = path.join(process.cwd(), "uploads/files");
const META_DIR = path.join(process.cwd(), "uploads/meta");

export async function POST(req: Request) {
  const formData = await req.formData();
  
  const filename = formData.get("filename") as string;
  const hash = formData.get("hash") as string;
  const totalChunks = Number(formData.get("totalChunks"));
  const type = formData.get('type')
  const size = Number(formData.get('size'))

  const ext = path.extname(filename);
  const chunkDir = path.join(CHUNK_DIR, hash);
  const filePath = path.join(FILE_DIR, hash + ext);

  await fs.mkdir(FILE_DIR, { recursive: true });

  const writeStream = await fs.open(filePath, "w");

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, String(i));
    const buffer = await fs.readFile(chunkPath);
    await writeStream.write(buffer);
  }

  await writeStream.close();

  // 写 meta
  await fs.mkdir(META_DIR, { recursive: true });
  await fs.writeFile(
    path.join(META_DIR, hash + ".json"),
    JSON.stringify(
      {
        hash,
        originalName: filename,
        type,
        ext,
        size,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  return NextResponse.json({
    success: true,
    hash,
    code: 200,
  });
}
