// Lightweight, resilient Tesseract.js wrapper with basic client-side preprocessing.
// Convert File/Blob inputs to data URLs and preprocess (resize + grayscale + contrast) to improve OCR accuracy.
let _worker = null
let _initializing = null

function fileToDataUrl(file){
  return new Promise((resolve, reject)=>{
    if(typeof file === 'string') return resolve(file)
    const reader = new FileReader()
    reader.onload = ()=>resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl){
  return new Promise((resolve, reject)=>{
    const img = new Image()
    img.onload = ()=>resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

async function preprocessDataUrl(dataUrl, maxWidth = 1400, contrast = 40){
  // Draw the image to a canvas, resize if needed, convert to grayscale and apply contrast.
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxWidth / img.width)
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  // draw resized image
  ctx.drawImage(img, 0, 0, w, h)

  // get image data and convert to grayscale + adjust contrast
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  // contrast factor
  const c = Math.max(-255, Math.min(255, contrast))
  const factor = (259 * (c + 255)) / (255 * (259 - c))
  for(let i=0;i<data.length;i+=4){
    const r = data[i], g = data[i+1], b = data[i+2]
    // luminance
    let lum = 0.299*r + 0.587*g + 0.114*b
    // apply contrast
    lum = factor * (lum - 128) + 128
    // clamp
    lum = Math.max(0, Math.min(255, lum))
    data[i] = data[i+1] = data[i+2] = lum
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}

export async function runOCR(fileOrBlob){
  try{
    const Tesseract = await import('tesseract.js')
    const logger = m => console.log('Tesseract', m)

    // If input is a File/Blob, convert to data URL for consistency and preprocess it.
    let input = fileOrBlob
    if(fileOrBlob instanceof Blob) {
      const dataUrl = await fileToDataUrl(fileOrBlob)
      try{
        input = await preprocessDataUrl(dataUrl, 1400, 40)
      }catch(err){
        console.warn('Preprocessing failed, falling back to original image', err)
        input = dataUrl
      }
    }

    // Prefer the high-level recognize API (handles loading internally).
    const recognize = Tesseract.recognize || Tesseract.default?.recognize
    if(recognize){
      // Use page segmentation mode 6 (assume a single uniform block of text) which often helps with labels.
      const res = await recognize(input, 'eng', { logger, tessedit_pageseg_mode: '6' })
      return res?.data?.text || res?.text || ''
    }

    // Fallback: createWorker if recognize isn't available
    const createWorker = Tesseract.createWorker || Tesseract.default?.createWorker
    if(!createWorker) throw new Error('tesseract.js API not found (no recognize or createWorker)')

    if(!_worker){
      _initializing = (async ()=>{
        const worker = createWorker({ logger })
        await worker.load()
        await worker.loadLanguage('eng')
        await worker.initialize('eng')
        _worker = worker
        _initializing = null
        return _worker
      })()
      await _initializing
    }else if(_initializing){
      await _initializing
    }

    const { data } = await _worker.recognize(input)
    return data?.text || ''
  }catch(err){
    console.error('OCR error', err)
    throw err
  }
}
