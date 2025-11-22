import React, { useState } from 'react'

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      if (!response.ok && response.status !== 401) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('adminToken', data.token)
        onLogin(data.token)
      } else {
        setError(data.error || 'Ungültiges Passwort')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(`Verbindung zum Server fehlgeschlagen. Stellen Sie sicher, dass der Backend-Server auf Port 3001 läuft. Fehler: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 px-4 py-8">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {!logoError ? (
              <img 
                src="/as-logo.jpeg" 
                alt="Alexandra Beauty - Lashes & More" 
                className="h-20 w-auto max-w-[250px] object-contain mx-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="text-center">
                <h1 className="text-3xl font-bold text-purple-600 mb-2">
                  AS Lashes & More
                </h1>
                <p className="text-sm text-gray-600">BY ALEXANDRA</p>
              </div>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
            Admin-Anmeldung
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2 px-2">
            Geben Sie Ihr Passwort ein, um auf das Admin-Panel zuzugreifen
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px]"
              placeholder="Admin-Passwort eingeben"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition min-h-[48px] text-base ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 active:bg-purple-700'
            }`}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Admin-Passwort erforderlich</p>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin

