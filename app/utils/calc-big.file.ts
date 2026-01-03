export interface FileChunk {
  index: number;
  chunk: Blob;
  hash?: string;
  upload: boolean;
}

// 切片
export const createFileChunks = (file: File) => {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
  const chunks: FileChunk[] = [];
  let index = 0;
  let start = 0;

  while (start < file.size) {
    const end = start + CHUNK_SIZE;
    chunks.push({
      index,
      chunk: file.slice(start, end),
      upload: false,
    });
    start = end;
    index++;
  }

  return chunks;
};

// 计算 hash
// const fileSpark = new SparkMD5.ArrayBuffer()

export const calculateBigFileHash = (
  chunks: FileChunk[]
): Promise<{ fileHash: string; chunks: FileChunk[] }> => {
  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("../worker/big.file.hash.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e) => {
      const { index, hash, type } = e.data as {
        index: number;
        hash: string;
        type: "chunk" | "file";
      };

      if (type === "chunk") {
        chunks[index].hash = hash;
      }

      if (type === "file") {
        worker.terminate();
        resolve({
          fileHash: hash,
          chunks,
        });
      }
    };

    // 必须按顺序发送
    chunks.forEach(({ chunk, index }) => {
      worker.postMessage({ chunk, index, total: chunks.length });
    });
  });
};
