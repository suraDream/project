'use client';

import io from 'socket.io-client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
export default function page() {
    const {userId} = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    useEffect(()=>{
        if(!user){
            router.push("/login");
        }
    }, [user])

    useEffect(()=>{
        const fetchNotifications = async () => {
            const res = await fetch(`${API_URL}/notification/all/${userId}`);
            const data = await res.json();
            setNotifications(data);
            console.log("Fetched notifications:", data);    
        };
        fetchNotifications();
    }, [userId, API_URL])

    useEffect(()=> {
        const readNotifications = async () => {
            try {
                const res = await fetch(`${API_URL}/notification/read-all-notification`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    // body: JSON.stringify({}) // not required here
                });
                const json = await res.json();
                if (res.ok) {
                    console.log("Marked all read:", json);
                    // ถ้ต้องการ รีโหลดรายการใหม่
                    const listRes = await fetch(`${API_URL}/notification/all/${userId}`);
                    const list = await listRes.json();
                    setNotifications(list || []);
                    // แจ้ง navbar อัพเดต badge
                    window.dispatchEvent(new CustomEvent("notifications-marked-read", { detail: { unreadCount: json.unreadCount } }));
                } else {
                    console.warn("Mark all read failed:", json);
                }
            } catch (err) {
                console.error("read-all-notification error:", err);
            }
        };

        // เรียกเมื่อ mount หรือเมื่อ userId เปลี่ยน (เรียกได้ตามต้องการ)
        readNotifications();
    }, [userId, API_URL])




  return (
    <div>
      <ul>
        {notifications.map((notification, index) => (
          <li key={`${notification.booking_id || 'notification'}-${index}`}>
            {notification.first_name} {notification.last_name} booked {notification.field_name} - {notification.sub_field_name} on {new Date(notification.booking_date).toLocaleDateString()} from {notification.start_time} to {notification.end_time}
          </li>
        ))}
      </ul>
    </div>
  )
}
