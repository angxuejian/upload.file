import request from "./request";

export function uploadSmallFile(file: File, hash: string, callback?: (p: number) => void, signal?: AbortSignal) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append('hash', hash)

  const signalConfig: { signal?: AbortSignal } = {}
  if (signal) {
    signalConfig['signal'] = signal;
  }

  return request.post("/upload-small/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (e) => {
        if (!e.total) return

        const progress = Math.round((e.loaded * 100) / e.total)
        if (callback) {
            callback(progress)
        }
    },
    ...signalConfig
  });
}
