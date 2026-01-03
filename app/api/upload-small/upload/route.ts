import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 存入 public 下即可直接访问
const FILE_DIR = path.join(process.cwd(), "uploads/files");
const META_DIR = path.join(process.cwd(), "uploads/meta");

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const hash = formData.get("hash") as string | null;

  if (!file || !hash) {
    return NextResponse.json(
      { error: "file and hash are required" },
      { status: 400 }
    );
  }

  // 确保目录存在
  await fs.mkdir(FILE_DIR, { recursive: true });
  await fs.mkdir(META_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const filePath = path.join(FILE_DIR, hash + ext);
  const metaPath = path.join(META_DIR, hash + ".json");

  // 保存文件（hash 作为文件名）
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  // 保存元数据（保留原始 name）
  const meta = {
    hash,
    originalName: file.name,
    size: file.size,
    type: file.type,
    ext,
    createdAt: new Date().toISOString(),
  };

  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

  return NextResponse.json({
    success: true,
    hash,
    code: 200,
  });
}
