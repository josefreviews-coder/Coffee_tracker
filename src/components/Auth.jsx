import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth(){
  const [email, setEmail] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    async function init(){
      try{
        // supabase-js v2
        const { data } = await supabase.auth.getUser()
        if(mounted) setUser(data?.user ?? null)
      }catch(e){
        // fallback for older versions
        try{ const u = supabase.auth.user(); if(mounted) setUser(u) }catch(_){}
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null)
      })
      return () => listener.subscription?.unsubscribe?.()
    }
    init()
    return () => { mounted = false }
  }, [])

  async function signIn(){
    if(!email) return alert('Enter an email address')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if(error) return alert(error.message)
    alert('Check your email for the sign-in link')
  }

  async function signOut(){
    await supabase.auth.signOut()
    setUser(null)
  }

  if(user) return (
    <div className="flex items-center gap-3">
      <div className="text-sm">Signed in as <strong>{user.email}</strong></div>
      <button onClick={signOut} className="text-sm text-blue-600">Sign out</button>
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      <input className="border rounded p-1 text-sm" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
      <button onClick={signIn} className="text-sm text-blue-600">Send magic link</button>
    </div>
  )
}
