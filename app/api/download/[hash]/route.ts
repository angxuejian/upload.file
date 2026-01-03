import fs from "fs/promises";
import path from "path";

const FILE_DIR = path.join(process.cwd(), "uploads/files");
const META_DIR = path.join(process.cwd(), "uploads/meta");

export async function GET(
  req: Request,
  { params }: { params: { hash: string } }
) {

const { hash } = await params

  const metaPath = path.join(META_DIR, hash + ".json");
    console.log(hash, '???')
  let meta;
  try {
    meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
  } catch {
    return new Response("File not found", { status: 404 });
  }

  const filePath = path.join(FILE_DIR, hash + meta.ext);
  const fileBuffer = await fs.readFile(filePath);

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": meta.type,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        meta.originalName
      )}"`,
    },
  });
}
