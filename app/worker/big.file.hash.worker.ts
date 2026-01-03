/// <reference lib="webworker" />

import SparkMD5 from "spark-md5";

const buffers: ArrayBuffer[] = [];
self.onmessage = async (e) => {
  const { chunk, index, total } = e.data as {
    chunk: Blob;
    index: number;
    total: number;
  };

  const arrayBuffer = await chunk.arrayBuffer();

  // 单个 chunk hash
  const chunkHash = SparkMD5.ArrayBuffer.hash(arrayBuffer);

  // 累加到文件 hash
  buffers[index] = arrayBuffer;

  self.postMessage({
    index,
    hash: chunkHash,
    type: "chunk",
  });

  // 所有 chunk 都到齐了
  if (buffers.filter(Boolean).length === total) {
    const spark = new SparkMD5.ArrayBuffer();
    for (let i = 0; i < total; i++) {
      spark.append(buffers[i]);
    }

    self.postMessage({
      type: "file",
      hash: spark.end(),
    });
  }
};
