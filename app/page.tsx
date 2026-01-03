"use client";

import { checkBigFile, checkSmallFile } from "@/services/check";
import { useRef, useState } from "react";
import { calculateSmallFileHash } from "./utils/calc-small-file";
import {
  createFileChunks,
  calculateBigFileHash,
  type FileChunk,
} from "./utils/calc-big.file";
import { uploadSmallFile } from "@/services/upload-small";
import { uploadBigFile, mergeBigFile } from "@/services/upload-big";

type FileSizeType = "small" | "big" | "";

interface FileInstance {
  file: File;
  hash: string;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingHash, setLoadingHash] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [fileName, setFileNanme] = useState<string>("");
  const [isFileType, setFileType] = useState<FileSizeType>("");
  const [progress, setProgress] = useState(0);
  const [chunks, setChunks] = useState<FileChunk[]>([]);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<"success" | "error" | "">(
    ""
  );

  const fileInstance = useRef<FileInstance | null>(null);
  const isPaused = useRef<boolean>(false);
  const controllerArr = useRef<
    { index: number; controller: AbortController }[]
  >([]);
  const uploadedCountRef = useRef(0);

  const triggerInputFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const file = files[0];

    isPaused.current = false;
    setUploadStatus("");
    setLoadingHash(true);
    setFileNanme(file.name);
    setFileUrl("");
    setProgress(0);
    setChunks([]);

    const size = Math.ceil(file.size / 1024 / 1024);

    console.log("文件名:", file.name);
    console.log("文件大小:", size + "MB");

    const callback = (f: File, h: string, t: FileSizeType) => {
      setLoadingHash(false);
      fileInstance.current = { file: f, hash: h };
      checkFilExists(h, t);

      console.log("文件hash:", h);
    };

    setFileType(size < 10 ? "small" : "big");

    if (size < 10) {
      calculateSmallFileHash(file).then((result) => {
        const { fileHash } = result;
        callback(file, fileHash, "small");
      });
    } else {
      const newChunks = createFileChunks(file);
      setChunks(newChunks);
      console.log("切片数量:", newChunks.length);
      console.log("第一个切片:", newChunks[0]);

      calculateBigFileHash(newChunks).then((result) => {
        const { fileHash, chunks: hashChunks } = result;
        setChunks([...hashChunks]);
        callback(file, fileHash, "big");
      });
    }

    // 允许再次选择同一个文件
    e.target.value = "";
  };

  const checkFilExists = async (fileHash: string, type: FileSizeType) => {
    try {
      const fn = type === "small" ? checkSmallFile : checkBigFile;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await fn(fileHash);

      if (!result.exists) {
        if (type === "big" && Array.isArray(result.uploadedChunks)) {
          result.uploadedChunks.forEach((item: number) => {
            setChunks((prev) =>
              prev.map((chunk) =>
                chunk.index === item ? { ...chunk, upload: true } : chunk
              )
            );
          });
        }
        return;
      }

      setFileUrl(result.data.hash + result.data.ext);

      if (type === "small") {
        setProgress(100);
      } else {
        if (result.data) {
          setChunks((prev) =>
            prev.map((chunk) => ({ ...chunk, upload: true }))
          );
        }
      }
    } catch (error) {
      console.error("checkFilExists:", error);
    }
  };

  const uploadBigChunksFile = async () => {
    const CONCURRENT = 3;
    const pool: Promise<void>[] = [];
    // let uploadIndex = 0;

    for (let i = 0; i < chunks.length; i++) {
      if (isPaused.current) {
        await Promise.allSettled(pool);
        break;
      }

      const itemChunk = chunks[i];
      if (itemChunk.upload) continue;

      const task = (async () => {
        if (!fileInstance.current) return;
        try {
          const controller = new AbortController();
          controllerArr.current.push({ index: itemChunk.index, controller });

          const fileData = new FormData();
          fileData.append("chunk", itemChunk.chunk);
          fileData.append("index", String(itemChunk.index));
          fileData.append("hash", fileInstance.current?.hash);

          await uploadBigFile(fileData, controller.signal);

          uploadedCountRef.current++;
          const controllerIndex = controllerArr.current.findIndex(
            (_) => _.index === itemChunk.index
          );
          if (controllerIndex !== -1) {
            controllerArr.current.splice(controllerIndex, 1);
          }
          setChunks((prev) =>
            prev.map((chunk) =>
              chunk.index === itemChunk.index
                ? { ...chunk, upload: true }
                : chunk
            )
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          if (error?.name !== "AbortError") {
            console.error("chunk upload failed:", itemChunk.index, error);
          }
        }
      })().finally(() => {
        pool.splice(pool.indexOf(task), 1);
      });

      pool.push(task);

      if (pool.length >= CONCURRENT) {
        await Promise.race(pool);
      }
    }

    if (!isPaused.current) {
      await Promise.all(pool);

      if (uploadedCountRef.current === chunks.length) {
        if (!fileInstance.current) return;
        const data = new FormData();
        data.append("hash", fileInstance.current.hash);
        data.append("filename", fileInstance.current.file.name);
        data.append("type", fileInstance.current.file.type);
        data.append("totalChunks", `${chunks.length}`);
        data.append("size", `${fileInstance.current.file.size}`);

        await mergeBigFile(data);

        setUploadStatus("success");
      }
    }
  };

  const startUpload = async () => {
    if (loading) return;

    setLoading(true);
    controllerArr.current = [];
    isPaused.current = false;
    if (!fileInstance.current) return;

    try {
      if (isFileType === "small") {
        const controller = new AbortController();
        controllerArr.current.push({ index: -1, controller });
        await uploadSmallFile(
          fileInstance.current.file,
          fileInstance.current.hash,
          (p) => {
            setProgress(p);
          },
          controller.signal
        );
        setUploadStatus("success");
      } else {
        await uploadBigChunksFile();
      }
    } catch {
      setUploadStatus("error");

      isPaused.current = false;
      setUploadStatus("");
      setLoadingHash(false);
      setFileNanme("");
      setFileUrl("");
      setProgress(0);
      setChunks([]);
    } finally {
      reset();
    }
  };

  const pauseUpload = () => {
    reset();
    isPaused.current = true;
    if (isFileType === "small") {
      setProgress(0);
    }
  };

  const reset = () => {
    setLoading(false);

    // 只是中断前端请求，后端还是会上传文件；所以下次检查上传的切片数量时，后端会比上次UI显示的多3个（并发3个）
    // 暂停还是要写个接口暂停，这样进度才能同步
    controllerArr.current.forEach((item) => {
      item.controller.abort();
    });
    controllerArr.current = [];
  };

  const handleDownload = () => {
    const hash = fileUrl.split(".")[0];
    window.open(`/api/show/${hash}`);
  };

  return (
    <main className={`w-[100vw] h-[100vh] ${loading ? "cursor-wait" : ""}`}>
      <div className="w-full h-ful pt-10 box- flex box-content items-center flex-col">
        <button
          disabled={loading}
          className="cursor-pointer border-b mb-5"
          onClick={triggerInputFile}
        >
          选择文件
        </button>

        <p className="mb-6">{fileName}</p>

        {isFileType === "small" && fileName && (
          <div className="w-[350px] flex flex-col items-center justify-center">
            <div className="w-[300px] relative h-[10px] bg-gray-400 overflow-hidden rounded">
              <div
                style={{ width: `${progress}%` }}
                className="h-[full] absolute inset-0  transition-all
          duration-300 bg-green-400"
              ></div>
            </div>
            <p className="mt-2">{progress}%</p>
          </div>
        )}

        {isFileType === "big" && fileName && (
          <ul className="grid grid-cols-10 gap-1">
            {chunks.map((_, index) => (
              <li
                key={index}
                className={`w-[15px] h-[15px] rounded ${
                  _.upload ? "bg-green-400" : "bg-gray-400 "
                }`}
              ></li>
            ))}
          </ul>
        )}

        <div>
          {fileName && !fileUrl && (
            <button
              disabled={loadingHash}
              // onClick={loading ? pauseUpload : startUpload}
              onClick={startUpload}
              className={` mt-6  border-b ${
                loadingHash ? "cursor-wait opacity-60" : "cursor-pointer"
              }
              ${loading ? "cursor-wait opacity-60" : "cursor-pointer"}
              `}
            >
              {/* {loading ? (isFileType === "small" ? "取消" : "暂停") : "上传"} */}
              {loading ? "上传中..." : "上传"}
            </button>
          )}
        </div>

        {uploadStatus && (
          <p
            className={`mt-6 ${
              uploadStatus === "success" ? "text-green-400" : "text-red-400"
            }`}
          >
            {uploadStatus}
          </p>
        )}

        {fileUrl && (
          <p onClick={handleDownload} className="mt-6 cursor-pointer border-b">
            click download: {fileUrl}
          </p>
        )}

        {/* Vercel 官方变量 */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
          <p className="mt-6">
            Tips: Vercel not support fs. Please try using git clone.
          </p>
        )}

        <input
          ref={inputRef}
          hidden
          onChange={handleFileChange}
          type="file"
          name="file"
          id=""
        />
      </div>
    </main>
  );
}
