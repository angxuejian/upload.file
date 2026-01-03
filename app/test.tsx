// "use client";

// import { useRef, useState } from "react";
// import { uploadSmallFile } from "../services/upload-small";
// import { uploadFile, fileMerge } from "../services/upload-big";
// import { checkFile, checkBigFile } from "../services/check";

// export default function Home() {
//   interface FileChunk {
//     index: number;
//     chunk: Blob;
//     hash?: string;
//     upload: boolean;
//   }

//   interface SmallFile {
//     file: File | null;
//     hash: string;
//   }
//   let controller: AbortController | null = null;
//   const controllerArr: { index: number; controller: AbortController }[] = [];
//   let isPaused: boolean = false;

//   const inputRef = useRef<HTMLInputElement>(null);
//   const [fileName, setFileNanme] = useState<string>("");
//   const [smallFile, setSmallFime] = useState<SmallFile>({
//     file: null,
//     hash: "",
//   });
//   const [chunks, setChunks] = useState<FileChunk[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [progress, setProgress] = useState(0);
//   const [fileNameHash, setFileNanmeHash] = useState<string>("");
//   const fileBigHashRef = useRef<string>('');

//   const openFileDialog = () => {
//     inputRef.current?.click();
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = e.target.files;
//     if (!files) return;

//     setSmallFime({ file: null, hash: "" });
//     setChunks([]);

//     const file = files[0];
//     setFileNanme(file.name);

//     const size = Math.ceil(file.size / 1024 / 1024);

//     console.log("文件名:", file.name);
//     console.log("文件大小:", size + "MB");

//     // 小于10MB，不需要切片
//     if (size <= 10) {
//       setSmallFime((prev) => ({ ...prev, file }));
//       calculateSmallFileHash(file).then((result) => {
//         console.log("文件hash:", result);
//         setSmallFime((prev) => ({ ...prev, hash: result }));

//         checkFilExists(result, false);
//       });
//     } else {
//       const newChunks = createFileChunks(file);
//       setChunks(newChunks);

//       console.log("切片数量:", newChunks.length);
//       console.log("第一个切片:", newChunks[0]);

//       calculateChunkHash(newChunks).then((result) => {
//         console.log("文件hash:", result.fileHash);
//         setChunks([...result.chunks]);

//         fileBigHashRef.current = result.fileHash
//         checkFilExists(result.fileHash, true);
//       });
//     }

//     // 允许再次选择同一个文件
//     e.target.value = "";
//   };

//   // 切片
//   const createFileChunks = (file: File) => {
//     const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
//     const chunks: FileChunk[] = [];
//     let index = 0;
//     let start = 0;

//     while (start < file.size) {
//       const end = start + CHUNK_SIZE;
//       chunks.push({
//         index,
//         chunk: file.slice(start, end),
//         upload: false,
//       });
//       start = end;
//       index++;
//     }

//     return chunks;
//   };

//   // 计算 hash
//   const calculateChunkHash = (
//     chunks: FileChunk[]
//   ): Promise<{ fileHash: string; chunks: FileChunk[] }> => {
//     return new Promise((resolve) => {
//       const worker = new Worker(
//         new URL("./worker/hash.worker.ts", import.meta.url),
//         { type: "module" }
//       );

//       worker.onmessage = (e) => {
//         const { index, hash, type } = e.data as {
//           index: number;
//           hash: string;
//           type: "chunk" | "file";
//         };

//         if (type === "chunk") {
//           chunks[index].hash = hash;
//         }

//         if (type === "file") {
//           worker.terminate();
//           resolve({
//             fileHash: hash,
//             chunks,
//           });
//         }
//       };

//       // 必须按顺序发送
//       chunks.forEach(({ chunk, index }, i) => {
//         worker.postMessage({ chunk, index, isLast: i === chunks.length - 1 });
//       });
//     });
//   };

//   // 计算小于10MB的文件的hash
//   const calculateSmallFileHash = (file: File): Promise<string> => {
//     return new Promise((resolve) => {
//       const worker = new Worker(
//         new URL("./worker/small.file.hash.worker.ts", import.meta.url),
//         { type: "module" }
//       );

//       worker.onmessage = (e) => {
//         const { hash } = e.data as { hash: string };

//         worker.terminate();
//         resolve(hash);
//       };

//       worker.postMessage({ file });
//     });
//   };

//   //
//   const checkFilExists = async (fileHash: string, isBigFile: boolean) => {
//     try {
//       const fn = isBigFile ? checkBigFile : checkFile;
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const result: any = await fn(fileHash);
//       console.log(result);

//       if (!result.exists) return;

//       setFileNanmeHash(result.data.hash + result.data.ext);

//       if (!isBigFile) {
//         setProgress(100);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const uploadChunks = async () => {
//     const CONCURRENT = 3;
//     const pool: Promise<void>[] = [];
//     let uploadIndex = 0;

//     for (let i = 0; i < chunks.length; i++) {
//       if (isPaused) break;

//       const itemChunk = chunks[i];
//       if (itemChunk.upload) continue;

//       const task = (async () => {
//         try {
//           const controller = new AbortController();
//           controllerArr.push({ index: itemChunk.index, controller });

//           const fileData = new FormData();
//           fileData.append("chunk", itemChunk.chunk);
//           fileData.append("index", String(itemChunk.index));
//           fileData.append("hash",  fileBigHashRef.current);

//           await uploadFile(fileData, controller.signal);

//           uploadIndex++;
//           const controllerIndex = controllerArr.findIndex(
//             (_) => _.index === itemChunk.index
//           );
//           if (controllerIndex !== -1) {
//             controllerArr.splice(controllerIndex, 1);
//           }
//           setChunks((prev) =>
//             prev.map((chunk) =>
//               chunk.index === itemChunk.index
//                 ? { ...chunk, upload: true }
//                 : chunk
//             )
//           );

//           // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         } catch (error: any) {
//           if (error?.name !== "AbortError") {
//             console.error("chunk upload failed:", itemChunk.index, error);
//           }
//         } finally {}
//       })().finally(() => {
//         pool.splice(pool.indexOf(task), 1);
//       });

//       pool.push(task);

//       if (pool.length >= CONCURRENT) {
//         await Promise.race(pool);
//       }
//     }

//     await Promise.all(pool);

//     if (uploadIndex === chunks.length) {
//       console.log('done')
//       const data = new FormData()
//        hash, filename, totalChunks, type
//       data.append('hash', fileBigHashRef.current)
//     //   data.append('filename', chunks)
//     //   await fileMerge()
//     }
//   };

//   const startUpload = async () => {
//     setLoading(true);

//     controller = null;
//     controllerArr.length = 0;
//     isPaused = false;

//     try {
//       if (smallFile.file !== null) {
//         controller = new AbortController();
//         await uploadSmallFile(
//           smallFile.file,
//           smallFile.hash,
//           (p) => {
//             setProgress(p);
//           },
//           controller.signal
//         );
//       } else if (chunks.length) {
//         await uploadChunks();
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const pauseUpload = () => {
//     setLoading(false);
//     isPaused = true;

//     if (controller !== null) {
//       controller.abort();
//       controller = null;
//     }

//     if (smallFile.file !== null) {
//       setProgress(0);
//     }

//     controllerArr.forEach((item) => {
//       item.controller.abort();
//     });

//     controllerArr.length = 0;
//   };

//   const handleShowFile = () => {
//     const hash = fileNameHash.split(".")[0];
//     window.open(`/api/show/${hash}`);
//   };

//   return (
//     <main className="w-[100vw] h-[100vh]">
//       <div className="w-full h-ful pt-10 box- flex box-content items-center flex-col">
//         <button
//           disabled={loading}
//           className="cursor-pointer border-b mb-5"
//           onClick={openFileDialog}
//         >
//           选择文件
//         </button>

//         <p className="mb-6">{fileName}</p>

//         {smallFile.file !== null && (
//           <div className="w-[260px] h-[10px] flex items-center justify-between">
//             <div className="w-[200px] h-[10px] bg-gray-400 overflow-hidden rounded">
//               <div
//                 style={{ width: `${progress}%` }}
//                 className="h-full  transition-all
//           duration-300 bg-green-400"
//               ></div>
//             </div>
//             <span>{progress}%</span>
//           </div>
//         )}

//         {chunks.length > 0 && (
//           <ul className="grid grid-cols-10 gap-1">
//             {chunks.map((_, index) => (
//               <li
//                 key={index}
//                 className={`w-[15px] h-[15px] rounded ${
//                   _.upload ? "bg-green-400" : "bg-gray-400 "
//                 }`}
//               ></li>
//             ))}
//           </ul>
//         )}

//         <div>
//           {fileName && !fileNameHash && (
//             <button
//               onClick={loading ? pauseUpload : startUpload}
//               className="cursor-pointer mt-6"
//             >
//               {loading ? (smallFile.file !== null ? "取消" : "暂停") : "上传"}
//             </button>
//           )}
//         </div>

//         {fileNameHash && (
//           <p onClick={handleShowFile} className="mt-6 cursor-pointer border-b">
//             click download: {fileNameHash}
//           </p>
//         )}
//       </div>

//       <input
//         ref={inputRef}
//         hidden
//         onChange={handleFileChange}
//         type="file"
//         name="file"
//         id=""
//       />
//     </main>
//   );
// }
