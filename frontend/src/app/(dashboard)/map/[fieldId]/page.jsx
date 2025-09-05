'use client'
import React, { useState } from 'react'
import { useParams, useRouter } from "next/navigation";
import LongdoMapPicker from '@/app/components/LongdoMapPicker'

export default function Map() {
  const [selectedLocation, setSelectedLocation] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const { fieldId } = useParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleSaveLocation = async () => {
    if (!selectedLocation) {
      alert('กรุณาเลือกตำแหน่งบนแผนที่ก่อน');
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/field/edit-location/${fieldId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gps_location: selectedLocation
        }),
      }); 

      const result = await response.json();
      if (response.ok) {
        alert('บันทึกตำแหน่งสำเร็จ!');
        router.back(); // กลับไปหน้าก่อนหน้า
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.error || 'ไม่สามารถบันทึกได้'}`);
      }
    } catch (error) {
      console.error('Save location error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsUpdating(false);
    }


  };
  
  console.log('Field ID from params:', fieldId);
  console.log('Selected location:', selectedLocation);

  return (
    <div style={{ padding: '20px' }}>
      <h2>เลือกตำแหน่งสนาม</h2>
      
      {!mapLoaded && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          กำลังโหลดแผนที่...
        </div>
      )}
      
      <LongdoMapPicker
        onLocationSelect={(location) => {
          setSelectedLocation(location)
          console.log('Selected location:', location)
        }}
        onMapReady={() => setMapLoaded(true)}
        initialLocation={selectedLocation || '13.736717,100.523186'}
      />

      {selectedLocation && (
        <div style={{ marginTop: 12 }}>
           พิกัดที่เลือก: {selectedLocation}
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button
          onClick={handleSaveLocation}
          disabled={!selectedLocation || isUpdating || !mapLoaded}
          style={{
            padding: '10px 20px',
            backgroundColor: selectedLocation && !isUpdating && mapLoaded ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: selectedLocation && !isUpdating && mapLoaded ? 'pointer' : 'not-allowed'
          }}
        >
          {isUpdating ? 'กำลังบันทึก...' : 'บันทึกตำแหน่ง'}
        </button>

        <button
          onClick={() => router.back()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer'
          }}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  )
}
