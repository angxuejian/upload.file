
  export const calculateSmallFileHash = (file: File): Promise<{ fileHash: string }> => {
    return new Promise((resolve) => {
      const worker = new Worker(
        new URL("../worker/small.file.hash.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (e) => {
        const { hash } = e.data as { hash: string };

        worker.terminate();
        resolve({ fileHash: hash });
      };

      worker.postMessage({ file });
    });
  };