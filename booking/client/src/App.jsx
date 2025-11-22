import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import AdminPanel from './components/AdminPanel'
import AdminLogin from './components/AdminLogin'
import BookingPage from './components/BookingPage'
import BookingsList from './components/BookingsList'

function App() {
  const [adminToken, setAdminToken] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    // Check if admin is already logged in
    const token = localStorage.getItem('adminToken')
    if (token) {
      // Verify token is still valid
      fetch('/api/admin/check', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (res.ok) {
            setAdminToken(token)
          } else {
            localStorage.removeItem('adminToken')
          }
        })
        .catch(() => {
          localStorage.removeItem('adminToken')
        })
        .finally(() => {
          setCheckingAuth(false)
        })
    } else {
      setCheckingAuth(false)
    }
  }, [])

  const handleLogin = (token) => {
    setAdminToken(token)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    setAdminToken(null)
  }

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (checkingAuth) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      )
    }
    return adminToken ? children : <Navigate to="/admin/login" replace />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16">
              <div className="flex items-center min-w-0 flex-1">
                <Link to="/" className="flex items-center space-x-2 min-w-0">
                  {!logoError ? (
                    <img 
                      src="/as-logo.jpeg" 
                      alt="Alexandra Beauty - Lashes & More" 
                      className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[200px] object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <span className="text-lg sm:text-2xl font-bold text-purple-600 truncate">
                      AS Lashes & More
                    </span>
                  )}
                </Link>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {adminToken ? (
                  <>
                    <Link
                      to="/admin"
                      className="text-gray-700 active:text-purple-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition min-h-[44px] flex items-center"
                    >
                      Plätze verwalten
                    </Link>
                    <Link
                      to="/bookings"
                      className="text-gray-700 active:text-purple-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition min-h-[44px] flex items-center"
                    >
                      Termine anzeigen
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/"
                      className="text-gray-700 active:text-purple-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition min-h-[44px] flex items-center"
                    >
                      Termin buchen
                    </Link>
                    <Link
                      to="/admin/login"
                      className="text-gray-700 active:text-purple-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition min-h-[44px] flex items-center"
                    >
                      Admin
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route 
            path="/admin/login" 
            element={
              adminToken ? (
                <Navigate to="/admin" replace />
              ) : (
                <AdminLogin onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminPanel adminToken={adminToken} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/bookings" 
            element={
              <ProtectedRoute>
                <BookingsList adminToken={adminToken} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App

