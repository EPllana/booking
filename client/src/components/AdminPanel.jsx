import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { displayTime24 } from '../utils/timeFormat'

// Memoized slot item component for better performance
const SlotItem = memo(({ slot, onDelete }) => {
  const handleDelete = useCallback(() => {
    onDelete(slot.id)
  }, [slot.id, onDelete])

  return (
    <div className="flex items-center justify-between bg-purple-50 rounded-lg p-2 sm:p-2.5">
      <span className="text-purple-700 font-medium text-sm sm:text-base">
        {displayTime24(slot.time)}
      </span>
      <button
        onClick={handleDelete}
        className="text-red-500 active:text-red-700 ml-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-lg sm:text-xl"
        title="Platz löschen"
      >
        ✕
      </button>
    </div>
  )
})

SlotItem.displayName = 'SlotItem'

function AdminPanel({ adminToken, onLogout }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSlot, setNewSlot] = useState({
    date: '',
    time: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getAuthHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  }), [adminToken])

  const fetchSlots = useCallback(async () => {
    try {
      const response = await fetch('/api/available-slots')
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
      const data = await response.json()
      setSlots(data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching slots:', err)
      setError('Plätze konnten nicht geladen werden. Bitte aktualisieren Sie die Seite.')
      setLoading(false)
      // Set empty array as fallback
      setSlots([])
    }
  }, [])

  useEffect(() => {
    if (adminToken) {
      fetchSlots()
    }
  }, [adminToken, fetchSlots])

  const handleAddSlot = useCallback(async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newSlot.date || !newSlot.time) {
      setError('Bitte füllen Sie sowohl Datum als auch Uhrzeit aus')
      return
    }

    try {
      const response = await fetch('/api/available-slots', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSlot)
      })

      if (response.status === 401) {
        setError('Sitzung abgelaufen. Bitte melden Sie sich erneut an.')
        onLogout()
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Platz konnte nicht hinzugefügt werden')
      }

      setSuccess('Platz erfolgreich hinzugefügt!')
      setNewSlot({ date: '', time: '' })
      fetchSlots()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }, [newSlot, getAuthHeaders, onLogout, fetchSlots])

  const handleDeleteSlot = useCallback(async (id) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Platz löschen möchten?')) {
      return
    }

    try {
      const response = await fetch(`/api/available-slots/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        setError('Sitzung abgelaufen. Bitte melden Sie sich erneut an.')
        onLogout()
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Platz konnte nicht gelöscht werden')
      }

      setSuccess('Platz erfolgreich gelöscht!')
      fetchSlots()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }, [getAuthHeaders, onLogout, fetchSlots])

  // Memoize grouped slots and sorted dates
  const { groupedSlots, sortedDates } = useMemo(() => {
    const grouped = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = []
    }
      acc[slot.date].push(slot)
      return acc
    }, {})
    return {
      groupedSlots: grouped,
      sortedDates: Object.keys(grouped).sort()
    }
  }, [slots])

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Memoize date formatting function
  const formatDate = useCallback((date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

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

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="text-center mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mb-4">
          <Link
            to="/bookings"
            className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 text-white rounded-lg active:bg-purple-700 transition font-medium text-sm sm:text-base min-h-[44px] flex items-center justify-center"
          >
            Termine anzeigen
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 order-first sm:order-none">
            Admin-Panel
          </h1>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-500 text-white rounded-lg active:bg-red-600 transition font-medium text-sm sm:text-base min-h-[44px]"
          >
            Abmelden
          </button>
        </div>
        <p className="text-sm sm:text-base text-gray-600 px-2">
          Verwalten Sie Ihre verfügbaren Terminplätze
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

      {/* Add New Slot Form */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">
          Verfügbaren Platz hinzufügen
        </h2>
        <form onSubmit={handleAddSlot} className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum *
            </label>
            <input
              type="date"
              required
              min={today}
              value={newSlot.date}
              onChange={(e) =>
                setNewSlot({ ...newSlot, date: e.target.value })
              }
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Uhrzeit *
            </label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <select
                  required
                  value={newSlot.time ? (() => {
                    const hour24 = parseInt(newSlot.time.split(':')[0] || '0')
                    return hour24 === 0 ? '12' : (hour24 > 12 ? (hour24 - 12).toString() : hour24.toString())
                  })() : '12'}
                  onChange={(e) => {
                    const hour12 = parseInt(e.target.value)
                    const minute = newSlot.time ? (newSlot.time.split(':')[1] || '00') : '00'
                    const isPM = newSlot.time ? (parseInt(newSlot.time.split(':')[0] || '0') >= 12) : false
                    let hour24 = hour12 === 12 ? 0 : hour12
                    if (isPM && hour24 !== 0) hour24 += 12
                    const hour24Str = hour24.toString().padStart(2, '0')
                    setNewSlot({ ...newSlot, time: `${hour24Str}:${minute}` })
                  }}
                  className="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white min-h-[44px]"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = (i + 1).toString()
                    return (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    )
                  })}
                </select>
              </div>
              <span className="flex items-center text-gray-500 font-bold text-lg sm:text-xl pb-2">:</span>
              <div className="flex-1">
                <select
                  required
                  value={newSlot.time ? newSlot.time.split(':')[1] || '00' : '00'}
                  onChange={(e) => {
                    const minute = e.target.value.padStart(2, '0')
                    const hour = newSlot.time ? (newSlot.time.split(':')[0] || '00') : '00'
                    setNewSlot({ ...newSlot, time: `${hour}:${minute}` })
                  }}
                  className="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white min-h-[44px]"
                >
                  {Array.from({ length: 60 }, (_, i) => {
                    const minute = i.toString().padStart(2, '0')
                    return (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="flex-1">
                <select
                  required
                  value={newSlot.time ? (parseInt(newSlot.time.split(':')[0] || '0') >= 12 ? 'PM' : 'AM') : 'AM'}
                  onChange={(e) => {
                    const isPM = e.target.value === 'PM'
                    const hour12 = newSlot.time ? (() => {
                      const hour24 = parseInt(newSlot.time.split(':')[0] || '0')
                      return hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24)
                    })() : 12
                    const minute = newSlot.time ? (newSlot.time.split(':')[1] || '00') : '00'
                    let hour24 = hour12 === 12 ? 0 : hour12
                    if (isPM && hour24 !== 0) hour24 += 12
                    const hour24Str = hour24.toString().padStart(2, '0')
                    setNewSlot({ ...newSlot, time: `${hour24Str}:${minute}` })
                  }}
                  className="w-full px-2 sm:px-3 py-2.5 sm:py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white min-h-[44px]"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-end sm:col-span-2 md:col-span-1">
            <button
              type="submit"
              className="w-full py-2.5 sm:py-2 bg-purple-600 text-white rounded-lg font-semibold active:bg-purple-700 transition text-base min-h-[44px]"
            >
              Platz hinzufügen
            </button>
          </div>
        </form>
      </div>

      {/* Existing Slots */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">
          Verfügbare Plätze ({slots.length})
        </h2>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading slots...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Keine verfügbaren Plätze. Fügen Sie welche über das Formular oben hinzu.
          </p>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="border-b pb-4 last:border-b-0">
                <h3 className="text-base sm:text-lg font-semibold text-purple-600 mb-2 sm:mb-3 break-words">
                  {formatDate(date)}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {groupedSlots[date]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((slot) => (
                      <SlotItem
                        key={slot.id}
                        slot={slot}
                        onDelete={handleDeleteSlot}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPanel

