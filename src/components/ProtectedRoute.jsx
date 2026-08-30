import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ProtectedRoute({ children }){
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    async function init(){
      try{
        const { data } = await supabase.auth.getUser()
        if(mounted) setUser(data?.user ?? null)
      }catch(e){
        try{ const u = supabase.auth.user(); if(mounted) setUser(u) }catch(_){}
      }
      if(mounted) setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, [])

  if(loading) return <div>Loading...</div>
  if(!user) return <Navigate to="/" replace />
  return children
}
