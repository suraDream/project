'use client'
import React, { useState } from 'react'
import LongdoMapPicker from '@/app/components/LongdoMapPicker'

export default function Map() {
  const [selectedLocation, setSelectedLocation] = useState('')

  return (
    <div>
      <LongdoMapPicker
        onLocationSelect={(location) => {
          setSelectedLocation(location)
          console.log('Selected location:', location)
        }}
        initialLocation={selectedLocation || '13.736717,100.523186'}
      />

      {selectedLocation && (
        <div style={{ marginTop: 12 }}>
          📍 พิกัดที่เลือก: {selectedLocation}
        </div>
      )}
    </div>
  )
}
