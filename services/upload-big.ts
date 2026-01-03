import request from "./request";

export function uploadBigFile(fileData: FormData, signal?: AbortSignal) {
  const signalConfig: { signal?: AbortSignal } = {};
  if (signal) {
    signalConfig["signal"] = signal;
  }

  return request.post("/upload-big/chunk", fileData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    ...signalConfig,
  });
}

export function mergeBigFile(formData: FormData) {
  return request.post("/upload-big/merge", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
