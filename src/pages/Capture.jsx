import React, { useState } from 'react'
import { runOCR } from '../lib/ocr'
import { supabase } from '../lib/supabaseClient'

export default function Capture(){
  const [file, setFile] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    roastery: '',
    coffee_name: '',
    origin: '',
    process: '',
    varietal: '',
    elevation_value: '',
    elevation_unit: 'm',
    tasting_notes: '',
    roast_date: '',
    opened_date: '',
    rating: ''
  })

  async function onFile(e){
    const f = e.target.files[0]
    if(!f) return
    setFile(f)
    setLoading(true)
    try{
      const text = await runOCR(f)
      setOcrText(text)
      // Do not auto-fill fields. Provide optional autofill button below.
    }catch(err){
      console.error(err)
      alert('OCR failed. See console for details.')
    }finally{setLoading(false)}
  }

  function handleChange(e){
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function onSave(){
    if(!file){ alert('Add a photo first'); return }
    setLoading(true)
    try{
      const fileName = `coffee-${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coffee-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if(uploadError) throw uploadError
      const photo_path = uploadData.path

      // sanitize numeric and date fields so Postgres doesn't receive empty strings
      const elevationValue = form.elevation_value === '' ? null : Number(form.elevation_value)
      const ratingValue = form.rating === '' ? null : Number(form.rating)
      const roastDate = form.roast_date ? form.roast_date : null
      const openedDate = form.opened_date ? form.opened_date : null

      const payload = {
        roastery: form.roastery || null,
        coffee_name: form.coffee_name || null,
        origin: form.origin || null,
        process: form.process || null,
        varietal: form.varietal || null,
        elevation_value: elevationValue,
        elevation_unit: form.elevation_unit || null,
        tasting_notes: form.tasting_notes || null,
        roast_date: roastDate,
        opened_date: openedDate,
        rating: ratingValue,
        photo_path,
        ocr_raw_text: ocrText || null
      }

      const { error: insertError } = await supabase
        .from('coffees')
        .insert([payload])
      if(insertError) throw insertError
      alert('Saved!')
      // reset
      setFile(null)
      setOcrText('')
      setForm({ roastery:'', coffee_name:'', origin:'', process:'', varietal:'', elevation_value:'', elevation_unit:'m', tasting_notes:'', roast_date:'', opened_date:'', rating:'' })
    }catch(err){
      console.error(err)
      alert('Save failed — check console')
    }finally{setLoading(false)}
  }

  async function autoFillFromOcr(){
    try{
      const { parseOcrText } = await import('../lib/parseOcr')
      const parsed = parseOcrText(ocrText)
      setForm(prev => ({
        ...prev,
        roastery: parsed.roastery || prev.roastery,
        coffee_name: parsed.coffee_name || prev.coffee_name,
        origin: parsed.origin || prev.origin,
        process: parsed.process || prev.process,
        varietal: parsed.varietal || prev.varietal,
        elevation_value: parsed.elevation_value || prev.elevation_value,
        elevation_unit: parsed.elevation_unit || prev.elevation_unit,
        tasting_notes: parsed.tasting_notes || prev.tasting_notes,
        roast_date: parsed.roast_date || prev.roast_date
      }))
    }catch(err){
      console.warn('Auto-fill failed', err)
      alert('Auto-fill failed — see console')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Photo</label>
        <input type="file" accept="image/*" capture="environment" onChange={onFile} />
      </div>

      {loading && <div className="text-sm text-gray-500">Processing...</div>}

      {ocrText && (
        <div className="bg-white p-3 rounded shadow-sm">
          <h3 className="font-medium">OCR Text (copy below)</h3>
          <textarea readOnly value={ocrText} className="w-full h-48 mt-2 p-2 border rounded text-sm" />
          <div className="mt-2 flex gap-2">
            <button onClick={()=>{ navigator.clipboard.writeText(ocrText) }} className="px-3 py-1 bg-blue-600 text-white rounded">Copy to clipboard</button>
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(ocrText)}`} download="ocr-text.txt" className="px-3 py-1 border rounded">Download</a>
            <button onClick={autoFillFromOcr} className="px-3 py-1 border rounded">Auto-fill fields</button>
            <button onClick={() => { setOcrText('') }} className="px-3 py-1 border rounded">Clear OCR</button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded shadow-sm grid gap-3">
        <label className="text-sm">Roastery
          <input name="roastery" value={form.roastery} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
        </label>
        <label className="text-sm">Coffee name
          <input name="coffee_name" value={form.coffee_name} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
        </label>
        <label className="text-sm">Origin
          <input name="origin" value={form.origin} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
        </label>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="text-sm">Process
            <input name="process" value={form.process} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </label>
          <label className="text-sm">Varietal
            <input name="varietal" value={form.varietal} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </label>
        </div>
        <div className="flex gap-2">
          <label className="flex-1">Elevation
            <input name="elevation_value" value={form.elevation_value} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </label>
          <label>
            <select name="elevation_unit" value={form.elevation_unit} onChange={handleChange} className="mt-1 p-2 border rounded">
              <option value="m">m</option>
              <option value="ft">ft</option>
            </select>
          </label>
        </div>
        <label className="text-sm">Tasting notes
          <textarea name="tasting_notes" value={form.tasting_notes} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
        </label>
        <div className="grid sm:grid-cols-3 gap-2">
          <label>Roast date
            <input type="date" name="roast_date" value={form.roast_date} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </label>
          <label>Opened date
            <input type="date" name="opened_date" value={form.opened_date} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </label>
          <label>Rating (1-10)
            <input name="rating" type="number" min="1" max="10" value={form.rating} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
          </label>
        </div>

        <div className="pt-2">
          <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>

    </div>
  )
}
