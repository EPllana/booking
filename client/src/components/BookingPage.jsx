import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { displayTime24 } from '../utils/timeFormat'

// Memoized slot button component
const SlotButton = React.memo(({ slot, isSelected, isBooked, onClick }) => {
  const handleClick = useCallback(() => {
    if (!isBooked) {
      onClick(slot)
    }
  }, [slot, isBooked, onClick])

  if (isBooked) {
    return (
      <div
        className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-600 cursor-not-allowed"
        title={`Gebucht von ${slot.booking?.clientName || 'Unbekannt'}`}
      >
        {displayTime24(slot.time)}
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-3 rounded-xl font-semibold transition-all transform ${
        isSelected
          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105 ring-2 ring-purple-300'
          : 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 hover:from-purple-100 hover:to-pink-100 hover:shadow-md hover:scale-102 border-2 border-purple-200'
      }`}
    >
      {displayTime24(slot.time)}
    </button>
  )
})

SlotButton.displayName = 'SlotButton'

function BookingPage() {
  const [allSlots, setAllSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: ''
  })
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [error, setError] = useState('')

  const fetchAllSlots = useCallback(async () => {
    try {
      const response = await fetch('https://booking-nxbv.onrender.com/api/all-slots-status')
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
      const data = await response.json()
      setAllSlots(data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error fetching slots:', err)
      setError('Plätze konnten nicht geladen werden. Bitte aktualisieren Sie die Seite.')
      setLoading(false)
      // Set empty array as fallback
      setAllSlots([])
    }
  }, [])

  useEffect(() => {
    fetchAllSlots()
  }, [fetchAllSlots])

  const handleSlotSelect = useCallback((slot) => {
    if (slot.isBooked) {
      return // Don't allow selecting booked slots
    }
    setSelectedSlot(slot)
    setError('')
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError('')

    if (!selectedSlot) {
      setError('Bitte wählen Sie einen Zeitslot')
      return
    }

    try {
      const response = await fetch('https://booking-nxbv.onrender.com/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          ...formData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Buchung fehlgeschlagen')
      }

      setBookingSuccess(true)
      setFormData({ clientName: '', clientEmail: '', clientPhone: '' })
      setSelectedSlot(null)
      fetchAllSlots()
      
      setTimeout(() => {
        setBookingSuccess(false)
      }, 5000)
    } catch (err) {
      setError(err.message)
    }
  }, [selectedSlot, formData, fetchAllSlots])

  // Memoize slot processing - only available slots
  const { groupedAvailableSlots, sortedAvailableDates } = useMemo(() => {
    const available = allSlots.filter(slot => !slot.isBooked)

    const groupedAvailable = available.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = []
      }
      acc[slot.date].push(slot)
      return acc
    }, {})

    return {
      groupedAvailableSlots: groupedAvailable,
      sortedAvailableDates: Object.keys(groupedAvailable).sort()
    }
  }, [allSlots])

  // Memoize date formatting
  const formatDate = useCallback((date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  // Format date for display (shorter format)
  const formatDateShort = useCallback((date) => {
    const d = new Date(date)
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' })
    return `${weekday}, ${day}.${month}`
  }, [])

  // Get all available slots sorted by date and time
  const sortedAvailableSlots = useMemo(() => {
    const available = allSlots.filter(slot => !slot.isBooked)
    return available.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    })
  }, [allSlots])

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="text-center mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Termin buchen
        </h1>
        <p className="text-sm sm:text-base text-gray-600 px-2">
          Wählen Sie unten einen verfügbaren Zeitslot
        </p>
      </div>

      {bookingSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          ✅ Buchung bestätigt! Wir sehen uns bald.
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
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Plätze werden geladen...</p>
        </div>
      ) : allSlots.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 text-lg">
            Derzeit sind keine Plätze verfügbar. Bitte schauen Sie später noch einmal vorbei.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Available Slots - All visible */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-2 border-purple-100">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 sm:w-7 sm:h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-lg sm:text-xl md:text-2xl">Verfügbare Termine</span>
            </h2>
            
            {sortedAvailableSlots.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                <p className="text-yellow-800 text-base sm:text-lg">Derzeit sind keine Plätze verfügbar</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
                {sortedAvailableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotSelect(slot)}
                    className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all transform text-left min-h-[60px] sm:min-h-[70px] ${
                      selectedSlot?.id === slot.id
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-600 shadow-lg scale-[1.01] sm:scale-[1.02]'
                        : 'bg-white text-gray-800 border-gray-200 active:border-purple-300 active:shadow-md active:bg-purple-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                          selectedSlot?.id === slot.id
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold text-base sm:text-lg truncate ${
                            selectedSlot?.id === slot.id ? 'text-white' : 'text-gray-800'
                          }`}>
                            {formatDateShort(slot.date)}
                          </div>
                          <div className={`text-xs sm:text-sm truncate ${
                            selectedSlot?.id === slot.id ? 'text-white/90' : 'text-gray-600'
                          }`}>
                            {formatDate(slot.date)}
                          </div>
                        </div>
                      </div>
                      <div className={`text-xl sm:text-2xl font-bold flex-shrink-0 ${
                        selectedSlot?.id === slot.id ? 'text-white' : 'text-purple-600'
                      }`}>
                        {displayTime24(slot.time)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-2 border-purple-100">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">✍️</span>
              <span className="text-lg sm:text-xl md:text-2xl">Ihre Daten</span>
            </h2>
            {selectedSlot ? (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 shadow-md animate-fadeIn">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-purple-600 text-white rounded-full p-1.5 sm:p-2 flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Ausgewählter Termin</p>
                    <p className="font-bold text-purple-800 text-base sm:text-lg break-words">
                      {formatDateShort(selectedSlot.date)} um {displayTime24(selectedSlot.time)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 text-center">
                <div className="flex justify-center mb-2">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
                <p className="text-blue-800 font-medium text-sm sm:text-base">Wählen Sie links einen Termin aus</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <span className="text-base sm:text-lg">👤</span>
                  <span className="text-sm sm:text-base">Vollständiger Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all active:border-purple-300 bg-purple-50"
                  placeholder="Ihren vollständigen Namen eingeben"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm sm:text-base">E-Mail *</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.clientEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, clientEmail: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all active:border-purple-300 bg-purple-50"
                  placeholder="ihre.email@beispiel.de"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm sm:text-base">Telefonnummer</span>
                </label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, clientPhone: e.target.value })
                  }
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all active:border-purple-300 bg-purple-50"
                  placeholder="+49 123 456789"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedSlot}
                className={`w-full py-3 sm:py-4 rounded-xl font-bold text-white text-base sm:text-lg transition-all transform min-h-[48px] ${
                  selectedSlot
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 active:from-purple-700 active:to-pink-700 shadow-lg active:shadow-xl active:scale-[0.98]'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {selectedSlot ? '✨ Buchung bestätigen' : 'Wählen Sie zuerst einen Zeitslot'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingPage

