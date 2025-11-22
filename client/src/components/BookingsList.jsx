import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { displayTime24 } from '../utils/timeFormat'

// Memoized booking item component
const BookingItem = React.memo(({ booking, onCancel }) => {
  const handleCancel = useCallback(() => {
    onCancel(booking.id, booking.clientName)
  }, [booking.id, booking.clientName, onCancel])

  const formattedDate = useMemo(() => {
    return new Date(booking.date).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [booking.date])

  const formattedCreatedAt = useMemo(() => {
    const date = new Date(booking.createdAt)
    // Format in 24-hour European format: DD/MM/YYYY HH:MM
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}`
  }, [booking.createdAt])

  return (
    <div className="bg-purple-50 rounded-lg p-3 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
          <span className="font-semibold text-purple-700 text-base sm:text-lg">
            {displayTime24(booking.time)}
          </span>
          <span className="font-semibold text-gray-800 text-sm sm:text-base break-words">
            {booking.clientName}
          </span>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
          <p className="break-all">📧 {booking.clientEmail}</p>
          {booking.clientPhone && (
            <p className="break-all">📞 {booking.clientPhone}</p>
          )}
          <p className="text-xs text-gray-500">
            Gebucht am: {formattedCreatedAt}
          </p>
        </div>
      </div>
      <button
        onClick={handleCancel}
        className="px-4 py-2.5 bg-red-500 text-white rounded-lg active:bg-red-600 transition font-medium text-sm sm:text-base min-h-[44px] w-full md:w-auto"
      >
        Buchung stornieren
      </button>
    </div>
  )
})

BookingItem.displayName = 'BookingItem'

function BookingsList({ adminToken, onLogout }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  }), [adminToken])

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings', {
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        setError('Session expired. Please login again.')
        onLogout()
        return
      }

      const data = await response.json()
      // Data is already sorted from server, no need to sort again
      setBookings(data)
      setLoading(false)
    } catch (err) {
      setError('Buchungen konnten nicht geladen werden')
      setLoading(false)
    }
  }, [getAuthHeaders, onLogout])

  useEffect(() => {
    if (adminToken) {
      fetchBookings()
    }
  }, [adminToken, fetchBookings])

  const handleCancelBooking = useCallback(async (id, clientName) => {
    if (!window.confirm(`Buchung für ${clientName} stornieren?`)) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        setError('Session expired. Please login again.')
        onLogout()
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Buchung konnte nicht storniert werden')
      }

      setSuccess('Buchung erfolgreich storniert!')
      fetchBookings()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }, [getAuthHeaders, onLogout, fetchBookings])

  // Memoize grouped bookings and sorted dates
  const { groupedBookings, sortedDates } = useMemo(() => {
    const grouped = bookings.reduce((acc, booking) => {
      if (!acc[booking.date]) {
        acc[booking.date] = []
      }
      acc[booking.date].push(booking)
      return acc
    }, {})
    return {
      groupedBookings: grouped,
      sortedDates: Object.keys(grouped).sort()
    }
  }, [bookings])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: getAuthHeaders()
      })
    } catch (err) {
      // Ignore logout errors
    }
    onLogout()
  }, [getAuthHeaders, onLogout])

  // Memoize date formatting
  const formatDate = useCallback((date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="text-center mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mb-4">
          <Link
            to="/admin"
            className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 text-white rounded-lg active:bg-purple-700 transition font-medium text-sm sm:text-base min-h-[44px] flex items-center justify-center"
          >
            Plätze verwalten
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 order-first sm:order-none">
            Alle Termine
          </h1>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-500 text-white rounded-lg active:bg-red-600 transition font-medium text-sm sm:text-base min-h-[44px]"
          >
            Abmelden
          </button>
        </div>
        <p className="text-sm sm:text-base text-gray-600 px-2">
          Alle Termine anzeigen und verwalten
        </p>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 text-lg">
            Noch keine Buchungen.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="mb-3 sm:mb-4">
            <p className="text-sm sm:text-base text-gray-600">
              Gesamtbuchungen: <span className="font-semibold text-purple-600">{bookings.length}</span>
            </p>
          </div>
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="border-b pb-4 last:border-b-0">
                <h3 className="text-base sm:text-lg font-semibold text-purple-600 mb-2 sm:mb-3 break-words">
                  {formatDate(date)}
                </h3>
                <div className="space-y-3">
                  {groupedBookings[date]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((booking) => (
                      <BookingItem
                        key={booking.id}
                        booking={booking}
                        onCancel={handleCancelBooking}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingsList

