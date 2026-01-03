/// <reference lib="webworker" />

import SparkMD5 from 'spark-md5'


self.onmessage = async (e) => {
  const { file } = e.data as {
    file: File
  }

  const arrayBuffer = await file.arrayBuffer()
  const fileHash = SparkMD5.ArrayBuffer.hash(arrayBuffer)

  self.postMessage({
    hash: fileHash
  })
}
