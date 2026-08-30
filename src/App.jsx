import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import Auth from './components/Auth'

export default function App(){
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto p-4 flex items-center gap-4">
          <h1 className="text-xl font-semibold">Coffee Catalog</h1>
          <nav className="ml-auto flex gap-3 items-center">
            <Link to="/capture" className="text-sm text-blue-600">Capture</Link>
            <Link to="/dashboard" className="text-sm text-blue-600">Dashboard</Link>
            <div className="ml-4">
              <Auth />
            </div>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
