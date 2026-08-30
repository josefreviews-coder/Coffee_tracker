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
      // Very basic parsing heuristics (can be improved later)
      const lines = text.split('\n').map(l=>l.trim()).filter(Boolean)
      setForm(prev => ({
        ...prev,
        roastery: lines[0] || prev.roastery,
        coffee_name: lines[1] || prev.coffee_name,
        tasting_notes: lines.slice(2,5).join(', ') || prev.tasting_notes
      }))
    }catch(err){
      console.error(err)
      alert('OCR failed. See console for details.')
    }finally{setLoading(false)}
  }

  function handleChange(e){
    const {name, value} = e.target
    setForm(prev=>({...prev, [name]: value}))
  }

  async function onSave(){
    if(!file) { alert('Add a photo first'); return }
    setLoading(true)
    try{
      // upload image to Supabase storage
      const fileName = `coffee-${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coffee-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })
      if(uploadError) throw uploadError
      const photo_path = uploadData.path
      // insert record
      const { error: insertError } = await supabase
        .from('coffees')
        .insert([{ ...form, photo_path, ocr_raw_text: ocrText }])
      if(insertError) throw insertError
      alert('Saved!')
      // reset form
      setFile(null)
      setOcrText('')
      setForm({ roastery:'', coffee_name:'', origin:'', elevation_value:'', elevation_unit:'m', tasting_notes:'', roast_date:'', opened_date:'', rating:'' })
    }catch(err){
      console.error(err)
      alert('Save failed — check console')
    }finally{setLoading(false)}
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
          <h3 className="font-medium">OCR Raw Text</h3>
          <pre className="text-sm whitespace-pre-wrap">{ocrText}</pre>
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
