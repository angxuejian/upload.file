import request from "./request";


export function checkSmallFile(hash: string) {
  return request.get("/upload-small/check", { params: { hash }});
}

export function checkBigFile(hash: string) {
    return request.get('/upload-big/check', { params: { hash }})
}