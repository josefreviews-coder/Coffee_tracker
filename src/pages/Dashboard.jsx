import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard(){
  const [coffees, setCoffees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      const { data, error } = await supabase
        .from('coffees')
        .select('*')
        .order('rating', { ascending: false })
        .limit(20)
      if(error) console.error(error)
      else setCoffees(data || [])
      setLoading(false)
    }
    load()
  },[])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Top-rated coffees</h2>
      {loading && <div>Loading...</div>}
      {!loading && coffees.length===0 && <div>No coffees yet. Use Capture to add some.</div>}
      <div className="grid gap-3">
        {coffees.map(c => (
          <div key={c.id} className="bg-white p-3 rounded shadow-sm flex gap-3">
            {c.photo_path ? (
              <img src={`${supabase.storage.from('coffee-images').getPublicUrl(c.photo_path).publicURL}`} alt="photo" className="w-24 h-24 object-cover rounded" />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded" />
            )}
            <div>
              <div className="font-medium">{c.roastery} — {c.coffee_name}</div>
              <div className="text-sm text-gray-600">Origin: {c.origin || '—'}</div>
              <div className="text-sm text-gray-600">Rating: {c.rating || '—'}</div>
              <div className="text-sm text-gray-600">Roast: {c.roast_date ? new Date(c.roast_date).toLocaleDateString() : '—'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
