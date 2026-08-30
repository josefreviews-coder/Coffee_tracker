import Tesseract from 'tesseract.js'

export async function runOCR(fileOrBlob){
  // Tesseract accepts File/Blob or image URL. Use blob directly.
  const worker = Tesseract.createWorker({
    logger: m => console.log('Tesseract', m)
  })
  await worker.load()
  await worker.loadLanguage('eng')
  await worker.initialize('eng')
  const { data } = await worker.recognize(fileOrBlob)
  await worker.terminate()
  return data?.text || ''
}
