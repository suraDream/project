"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import LogoutButton from "@/app/components/Logout";
import "@/app/css/navbar.css";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/th";
import { io } from "socket.io-client";

dayjs.extend(relativeTime);
dayjs.locale("th");

export default function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const userProfileRef = useRef(null);
  const notifyRef = useRef(null);
  const notifyBtnRef = useRef(null);
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const authDropdownRef = useRef(null);
  const authButtonRef = useRef(null);
  const socketRef = useRef(null);
  const loadedInitialRef = useRef(false);
  const loadingRef = useRef(false);
  const lastLoadTime = useRef(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [keyId, setKeyId] = useState(null);
  const [topic, setTopic] = useState("");
  const [notifyId, setNotifyId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const loadExistingNotifications = useCallback(async () => {
    if (!user?.user_id || !API_URL || loadingRef.current) return;

    loadingRef.current = true;
    try {
      console.log("Loading existing notifications for user:", user.user_id);
      const res = await fetch(`${API_URL}/notification/all/${user.user_id}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Loaded existing notifications:", data);

        if (Array.isArray(data)) {
          const formattedNotifications = data.map((notification) => ({
            notifyId: notification.notify_id,
            keyId: notification.key_id,
            topic: notification.topic,
            senderName: `${notification.sender_first_name || ""} ${
              notification.sender_last_name || ""
            }`.trim(),
            reciveName: `${notification.recive_first_name || ""} ${
              notification.recive_last_name || ""
            }`.trim(),
            fieldName: notification.field_name || "",
            fieldId: notification.field_id || null,
            subFieldName: notification.sub_field_name || "",
            bookingDate: notification.booking_date || null,
            startTime: notification.start_time || null,
            endTime: notification.end_time || null,
            rawMessage: notification.messages || "",
            postContent: notification.content || "",
            created_at: notification.created_at,
            status: notification.status,
            isRead: String(notification.status).toLowerCase() !== "unread",
          }));
          console.log("Formatted notifications:", formattedNotifications);
          const totalUnread = formattedNotifications.filter(
            (n) => !n.isRead
          ).length;
          setUnreadCount(totalUnread);
          setNotifications(formattedNotifications.slice(0, 10));
          localStorage.setItem("unreadCount", totalUnread.toString());
        }
      }
    } catch (error) {
      console.error("Error loading existing notifications:", error);
    } finally {
      loadingRef.current = false;
    }
  }, [API_URL, user?.user_id]);

  useEffect(() => {
    if (!user?.user_id) {
      setNotifications([]);
      setUnreadCount(0);
      localStorage.removeItem("unreadCount");
      return;
    }

    if (!API_URL || loadedInitialRef.current) return;

    const savedCount = localStorage.getItem("unreadCount");
    if (savedCount) {
      setUnreadCount(parseInt(savedCount));
    }

    loadedInitialRef.current = true;
    loadExistingNotifications();
  }, [user?.user_id, API_URL, loadExistingNotifications]);

  useEffect(() => {
    loadedInitialRef.current = false;
    loadingRef.current = false;
  }, [user?.user_id]);

  useEffect(() => {
    if (!API_URL || !user?.user_id) {
      console.log("Skip socket init - Missing API_URL or user_id");
      return;
    }

    console.log("Initializing socket with API_URL:", API_URL);
    const socket = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("new_notification", (data) => {
      console.log("new_notification event received:", data);
      console.log(
        "Current user ID:",
        user?.user_id,
        " | Notification user ID:",
        data?.reciveId
      );

      if (parseInt(user?.user_id) === parseInt(data?.reciveId)) {
        console.log(
          "User matched! Processing notification for keyId:",
          data.keyId
        );

        if (data.topic === "reset_count" || data.topic === "update_count") {
          console.log("Handling count reset, not reloading notifications");
          setUnreadCount(data.unreadCount || 0);
          localStorage.setItem(
            "unreadCount",
            (data.unreadCount || 0).toString()
          );
        } else {
          const now = Date.now();
          if (now - lastLoadTime.current < 2000) {
            console.log("Rate limited: skipping notification reload");
            return;
          }
          lastLoadTime.current = now;

          setKeyId(data.keyId);
          setTopic(data.topic);
          setNotifyId(data.notifyId);
          loadExistingNotifications();
        }
      } else {
        console.log("Skipping notification (user not matched)");
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
    });

    return () => {
      console.log("Disconnecting socket");
      socket.disconnect();
    };
  }, [API_URL, user?.user_id, loadExistingNotifications]);

  const handleBellClick = () => {
    setIsNotifyOpen((prev) => !prev);
  };

  const handleNotificationClick = (notification) => {
    // Optimistically mark as read only if currently unread
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.notifyId === notification.notifyId
            ? { ...n, isRead: true, status: "read" }
            : n
        )
      );
      setUnreadCount((prev) => {
        const newCount = Math.max(0, prev - 1);
        localStorage.setItem("unreadCount", newCount.toString());
        return newCount;
      });
    }
    const currentTopic = notification.topic;
    const currentKeyId = notification.keyId;

    if (
      [
        "new_booking",
        "booking_approved",
        "booking_rejected",
        "booking_complete",
        "deposit_payment_uploaded",
        "total_slip_payment_uploaded",
        "booking_cancelled",
      ].includes(currentTopic)
    ) {
      if (currentKeyId) {
        router.push(`/booking-detail/${currentKeyId}`);
      } else {
        setMessage("ไม่พบข้อมูลการจองนี้");
        setMessageType("error");
      }
      return;
    }

    if (
      [
        "field_registered",
        "field_approved",
        "field_rejected",
        "field_appeal",
      ].includes(currentTopic)
    ) {
      if (currentKeyId) {
        router.push(`/check-field/${currentKeyId}`);
      } else {
        setMessage("ไม่พบข้อมูลสนามนี้");
        setMessageType("error");
      }
      return;
    }
    if (["field_posted"].includes(currentTopic)) {
      if (currentKeyId) {
        router.push(
          `/profile/${
            notification.fieldId || notification.field_id || ""
          }?highlight=${currentKeyId}`
        );
      } else {
        setMessage("ไม่พบข้อมูลโพสต์นี้");
        setMessageType("error");
      }
      return;
    }
    router.push(`/notifications/${user?.user_id}`);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !(userProfileRef.current && userProfileRef.current.contains(e.target))
      ) {
        setIsDropdownOpen(false);
      }
      if (
        authDropdownRef.current &&
        !authDropdownRef.current.contains(e.target) &&
        !(authButtonRef.current && authButtonRef.current.contains(e.target))
      ) {
        setIsAuthDropdownOpen(false);
      }
      if (
        notifyRef.current &&
        !notifyRef.current.contains(e.target) &&
        !(notifyBtnRef.current && notifyBtnRef.current.contains(e.target))
      ) {
        setIsNotifyOpen(false);
      }
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !(hamburgerRef.current && hamburgerRef.current.contains(e.target))
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
        setIsSearchOpen(false);
        setIsNotifyOpen(false);
        setIsMenuOpen(false);
        setIsAuthDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <nav className="nav">
      {message && (
        <div className={`message-box ${messageType}`}>
          <p>{message}</p>
        </div>
      )}
      <div className="ullist">
        <button
          className="hamburger"
          onClick={() => setIsMenuOpen((v) => !v)}
          aria-label="เปิดเมนู"
          ref={hamburgerRef}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>
      <div className="mid-logo">
        <Link href="/" className="logo">
          <img
            src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1750926494/logo2_jxtkqq.png"
            alt="Sport-Hub Logo"
            width="100"
            height="70"
            style={{ objectFit: "cover" }}
          />
        </Link>
      </div>
      <div className="user">
        <div className="search-container" ref={searchRef}>
          <button
            className="icon-btn search-button"
            onClick={() => setIsSearchOpen((v) => !v)}
            aria-label="ค้นหา"
          >
            <img
              src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755158827/garden--search-26_f3tko8.png"
              alt="ค้นหา"
              width="26"
              height="26"
            />
          </button>
          <input
            type="text"
            placeholder="ค้นหา..."
            className={`search-box ${isSearchOpen ? "active" : ""}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const query = e.currentTarget.value.trim();
                if (query)
                  router.push(`/search?query=${encodeURIComponent(query)}`);
              }
            }}
          />
        </div>

        {isLoading ? (
          <span className="dot-loading">
            <span className="dot one">●</span>
            <span className="dot two">●</span>
            <span className="dot three">●</span>
          </span>
        ) : user ? (
          <div
            className={`user-profile ${isDropdownOpen ? "active" : ""}`}
            onClick={() => setIsDropdownOpen((v) => !v)}
            ref={userProfileRef}
          >
            <img
              alt="โปรไฟล์"
              width={30}
              height={30}
              className="avatar"
              src={
                user?.user_profile
                  ? user.user_profile
                  : "https://res.cloudinary.com/dlwfuul9o/image/upload/v1755157542/qlementine-icons--user-24_zre8k9.png"
              }
            />

            <div className="dropdown" ref={dropdownRef}>
              <ul>
                <li className="dropdown-user">
                  {user?.first_name} {""}
                  {user?.last_name}
                </li>
                <li className="dropdown-role">
                  {user?.role === "admin" && "ผู้ดูแลระบบ"}
                  {user?.role === "field_owner" && "เจ้าของสนามกีฬา"}
                  {user?.role === "customer" && "ลูกค้า"}
                </li>
                <hr className="dropdown-divider" />
                <li>
                  <Link href="/edit-profile">
                    <img
                      src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755270276/tdesign--user-setting_zxrpzz.png"
                      width={20}
                      height={20}
                      alt=""
                    />
                    แก้ไขโปรไฟล์
                  </Link>
                </li>
                {/* {user?.role === "customer" && (
                  <li>
                    <Link href="/register-field">ลงทะเบียนสนาม</Link>
                  </li>
                )} */}
                {user?.role === "field_owner" && (
                  <>
                    <li>
                      <Link href="/my-field">
                        <img
                          src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755270427/material-symbols--stadium-outline_ile9cr.png"
                          width={20}
                          height={20}
                          alt=""
                        />
                        สนามกีฬาของฉัน
                      </Link>
                    </li>
                  </>
                )}
                {user?.role === "admin" && (
                  <>
                    <li>
                      <Link href="/manage-user">
                        <img
                          src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755270798/la--user-lock_ouffik.png"
                          width={20}
                          height={20}
                          alt=""
                        />
                        จัดการผู้ใช้
                      </Link>
                    </li>
                    <li>
                      <Link href="/my-field">
                        <img
                          src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755270427/material-symbols--stadium-outline_ile9cr.png"
                          width={20}
                          height={20}
                          alt=""
                        />
                        จัดการสนามกีฬา
                      </Link>
                    </li>
                    {/* <li>
                      <Link href="/manage-facility">
                        <img
                          src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755270985/fluent-emoji-high-contrast--running-shoe_c5koea.png"
                          width={20}
                          height={20}
                          alt=""
                        />
                        จัดการสิ่งอำนวยความสะดวก
                      </Link>
                    </li> */}
                    <li>
                      <Link href="/manage-sport-type">
                        <img
                          src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755270745/fluent--sport-20-regular_djdy8v.png"
                          width={20}
                          height={20}
                          alt=""
                        />
                        จัดการประเภทกีฬา
                      </Link>
                    </li>
                  </>
                )}
                {(user?.role === "customer" ||
                  user?.role === "admin" ||
                  user?.role === "field_owner") && (
                  <li>
                    <Link href="/my-booking">
                      <img
                        src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755270498/icon-park-outline--doc-detail_1_kbh7dy.png"
                        width={20}
                        height={20}
                        alt=""
                      />
                      รายการจองสนามของฉัน
                    </Link>
                  </li>
                )}
                <LogoutButton />
              </ul>
            </div>
          </div>
        ) : (
          <div
            className={`user-profile ${isAuthDropdownOpen ? "active" : ""}`}
            onClick={() => setIsAuthDropdownOpen((v) => !v)}
            ref={authButtonRef}
          >
            <img
              src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1756123318/mdi--register_ndxxeb.png"
              alt="โปรไฟล์"
              width={28}
              height={28}
              // className="avatar"
            />

            <div className="dropdown" ref={authDropdownRef}>
              <ul>
                <li>
                  <Link
                    href="/login"
                    onClick={() => setIsAuthDropdownOpen(true)}
                  >
                    <img
                      src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1756123250/ic--baseline-login_gzhjrf.png"
                      alt=""
                    />
                    เข้าสู่ระบบ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    onClick={() => setIsAuthDropdownOpen(true)}
                  >
                    <img
                      src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1756123318/mdi--register_ndxxeb.png"
                      alt=""
                    />
                    สมัครสมาชิก
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}
        {user && (
          <div className="notify">
            <button
              className="icon-btn notify-btn"
              onClick={handleBellClick}
              aria-label="แจ้งเตือน"
              ref={notifyBtnRef}
            >
              <img
                src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755157482/mdi-light--bell_wt2uc1.png"
                alt="แจ้งเตือน"
                width={30}
                height={30}
              />
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
            {isNotifyOpen && (
              <div className="notify-dropdown" ref={notifyRef}>
                <div className="notify-dropdown-header">การแจ้งเตือน</div>
                <ul className="notification-list">
                  {notifications.length > 0 ? (
                    notifications.map((notification, index) => (
                      <li
                        key={`${notification.notifyId}-${index}`}
                        className={`notification-item ${
                          !notification.isRead ? "unread" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {notification.topic === "new_booking" && (
                          <>
                            <strong className="notif-new_booking">
                              มีการจองสนามใหม่
                            </strong>
                            <br />
                            <small>หมายเลข: #{notification.keyId}</small>
                            <br />
                            <small>
                              ผู้จอง: {notification.senderName || "-"}
                            </small>
                            <br />
                            <small>
                              สนาม: {notification.fieldName || "-"}
                              <br />
                              สนามย่อย: {notification.subFieldName || "-"}
                            </small>
                            <br />
                            {notification.bookingDate && (
                              <small>
                                วันที่: {formatDate(notification.bookingDate)}
                                <br />
                                เวลา: {notification.startTime} -{" "}
                                {notification.endTime}
                              </small>
                            )}
                          </>
                        )}
                        {notification.topic === "booking_approved" && (
                          <>
                            <strong className="notif-new_booking">
                              การจองได้รับการอนุมัติแล้ว
                            </strong>
                            <br />
                            <small>หมายเลข: #{notification.keyId}</small>
                            <br />
                            {notification.reciveName && (
                              <small>
                                ผู้จอง: {notification.reciveName || "-"}
                              </small>
                            )}
                            <br />
                            <small>
                              สนาม: {notification.fieldName || "-"}
                              <br />
                              สนามย่อย: {notification.subFieldName || "-"}
                            </small>
                            <br />
                            {notification.bookingDate && (
                              <small>
                                วันที่: {formatDate(notification.bookingDate)}
                                <br />
                                เวลา: {notification.startTime} -{" "}
                                {notification.endTime}
                              </small>
                            )}
                          </>
                        )}
                        {notification.topic === "booking_rejected" && (
                          <>
                            <strong className="notif-new_booking">
                              การจองถูกปฏิเสธ
                            </strong>
                            <br />
                            <small className="notif-rejected-reson">
                              เหตุผล: {notification.rawMessage}
                            </small>
                            <br />
                            <small>หมายเลข: #{notification.keyId}</small>
                            <br />
                            {notification.reciveName && (
                              <small>
                                ผู้จอง: {notification.reciveName || "-"}
                              </small>
                            )}
                            <br />
                            <small>
                              สนาม: {notification.fieldName || "-"}
                              <br />
                              สนามย่อย: {notification.subFieldName || "-"}
                            </small>
                            <br />
                            {notification.bookingDate && (
                              <small>
                                วันที่: {formatDate(notification.bookingDate)}
                                <br />
                                เวลา: {notification.startTime} -{" "}
                                {notification.endTime}
                              </small>
                            )}
                          </>
                        )}
                        {notification.topic === "booking_complete" && (
                          <>
                            <strong className="notif-new_booking">
                              การจองเสร็จสิ้น
                            </strong>
                            <br />
                            <small>หมายเลข: #{notification.keyId}</small>
                            <br />
                            <small>
                              สนาม: {notification.fieldName || "-"}
                              <br />
                              สนามย่อย: {notification.subFieldName || "-"}
                            </small>
                            <br />
                            {notification.bookingDate && (
                              <small>
                                วันที่: {formatDate(notification.bookingDate)}
                                <br />
                                เวลา: {notification.startTime} -{" "}
                                {notification.endTime}
                              </small>
                            )}
                            <br />
                            <small className="notif-hint">
                              กรณีต้องการให้คะแนนสนาม คลิกที่หมายเลขการจองนี้
                            </small>
                          </>
                        )}
                        {notification.topic === "deposit_payment_uploaded" && (
                          <>
                            <strong className="notif-new_booking">
                              มีการอัปโหลดสลิปมัดจำ
                            </strong>
                            <br />
                            <small>หมายเลข: #{notification.keyId}</small>
                            <br />
                            <small>
                              สนาม: {notification.fieldName || "-"}
                              <br />
                              สนามย่อย: {notification.subFieldName || "-"}
                            </small>
                            <br />
                            {notification.bookingDate && (
                              <small>
                                วันที่: {formatDate(notification.bookingDate)}
                                <br />
                                เวลา: {notification.startTime} -{" "}
                                {notification.endTime}
                              </small>
                            )}
                          </>
                        )}
                        {notification.topic ===
                          "total_slip_payment_uploaded" && (
                          <>
                            <strong className="notif-new_booking">
                              มีการอัปโหลดสลิปยอดทั้งหมด
                            </strong>
                            <br />
                            <small>หมายเลข: #{notification.keyId}</small>
                            <br />
                            <small>
                              สนาม: {notification.fieldName || "-"}
                              <br />
                              สนามย่อย: {notification.subFieldName || "-"}
                            </small>
                            <br />
                            {notification.bookingDate && (
                              <small>
                                วันที่: {formatDate(notification.bookingDate)}
                                <br />
                                เวลา: {notification.startTime} -{" "}
                                {notification.endTime}
                              </small>
                            )}
                          </>
                        )}

                        {notification.topic === "field_registered" && (
                          <>
                            <strong className="notif-new_booking">
                              มีการลงทะเบียนสนามใหม่
                            </strong>
                            <br />
                            <small>
                              เจ้าของสนาม: {notification.senderName || "-"}
                            </small>
                          </>
                        )}
                        {notification.topic === "field_approved" && (
                          <>
                            <strong className="notif-new_booking">
                              สนามกีฬาของคุณได้รับการอนุมัติ
                            </strong>
                            <br />
                            <small>
                              เจ้าของสนาม: {notification.senderName || "-"}
                            </small>
                          </>
                        )}
                        {notification.topic === "field_appeal" && (
                          <>
                            <strong className="notif-new_booking">
                              คำร้องลงทะเบียนสนามอีกครั้ง
                            </strong>
                            <br />
                            <small>
                              เจ้าของสนาม: {notification.senderName || "-"}
                            </small>
                          </>
                        )}
                        {notification.topic === "field_rejected" && (
                          <>
                            <strong className="notif-new_booking">
                              สนามกีฬาของคุณไม่ได้รับการอนุมัติ
                            </strong>
                            <br />
                            <small className="notif-rejected-reson">
                              เหตุผล: {notification.rawMessage || "-"}
                            </small>
                            <br />
                            <small>
                              เจ้าของสนาม: {notification.senderName || "-"}
                            </small>
                            <br />
                          </>
                        )}
                        {notification.topic === "field_posted" && (
                          <>
                            <strong className="notif-new_booking">
                              มีโพสต์ใหม่
                            </strong>
                            <br />
                            {notification.fieldName && (
                              <small>
                                สนาม: {notification.fieldName || "-"}
                              </small>
                            )}
                            {notification.postContent && (
                              <>
                                <br />
                                <small>
                                  หัวข้อ:{" "}
                                  {notification.postContent.slice(0, 10)}
                                  {notification.postContent.length > 10 &&
                                    "..."}
                                </small>
                              </>
                            )}
                          </>
                        )}
                        {notification.topic === "booking_cancelled" && (
                          <>
                            <strong className="notif-new_booking">
                              การจองถูกยกเลิกโดยเจ้าของสนาม
                            </strong>
                            <br />
                            <small>หมายเลข: #{notification.keyId}</small>
                            <br />
                            <small>
                              ผู้จอง: {notification.reciveName || "-"}
                            </small>
                            <br />
                            <small>
                              สนาม: {notification.fieldName || "-"}
                              <br />
                              สนามย่อย: {notification.subFieldName || "-"}
                            </small>
                            <br />
                            {notification.bookingDate && (
                              <small>
                                วันที่: {formatDate(notification.bookingDate)}
                                <br />
                                เวลา: {notification.startTime} -{" "}
                                {notification.endTime}
                              </small>
                            )}
                          </>
                        )}
                        {![
                          "new_booking",
                          "booking_approved",
                          "booking_rejected",
                          "booking_complete",
                          "booking_cancelled",
                          "deposit_payment_uploaded",
                          "total_slip_payment_uploaded",
                          "field_registered",
                          "field_approved",
                          "field_rejected",
                          "field_appeal",
                          "field_posted",
                          "booking_cancelled",
                        ].includes(notification.topic) && (
                          <>
                            <strong>การแจ้งเตือน</strong>
                            <br />
                            <small>Ref: #{notification.keyId}</small>
                          </>
                        )}
                        <span className="notification-time">
                          {dayjs(notification.created_at).fromNow()}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="notification-item empty">
                      ไม่มีการแจ้งเตือน
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => {
                    setIsNotifyOpen(false);
                    router.push(`/notifications/${user?.user_id}`);
                  }}
                  className="notify-view-all"
                >
                  ดูการแจ้งเตือนทั้งหมด
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={`menu-overlay ${isMenuOpen ? "show" : ""}`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden
      />
      <aside className={`side-menu ${isMenuOpen ? "open" : ""}`} ref={menuRef}>
        <div className="side-header">
          <button
            className="close-x"
            onClick={() => setIsMenuOpen(false)}
            aria-label="ปิดเมนู"
          >
            ×
          </button>
        </div>
        <ul className="side-list">
          <li>
            <Link
              href="/"
              className={pathname === "/" ? "active" : ""}
              onClick={() => setIsMenuOpen(false)}
            >
              <img
                className={pathname === "/" ? "active" : ""}
                src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755164212/material-symbols-light--home-outline-rounded_ebvqko.png"
                alt=""
                width={30}
                height={30}
              />
              หน้าแรก
            </Link>
          </li>
          <li>
            <Link
              className={pathname === "/categories" ? "active" : ""}
              href="/categories"
              onClick={() => setIsMenuOpen(false)}
            >
              <img
                width={30}
                height={30}
                src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755163390/material-symbols-light--stadium-outline-rounded_db1dco.png"
                alt=""
              />
              สนามกีฬาทั้งหมด
            </Link>
          </li>
          {user && (
            <li>
              <Link
                className={pathname === "/contact" ? "active" : ""}
                href="/contact"
                onClick={() => setIsMenuOpen(false)}
              >
                <img
                  src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755163804/qlementine-icons--user-24_zojp8t.png"
                  alt=""
                  width={30}
                  height={30}
                />
                ติดต่อผู้ดูแลระบบ
              </Link>
            </li>
          )}

          {user && (
            <li>
              <Link
                className={pathname === "/register-field" ? "active" : ""}
                href="/register-field"
                onClick={() => setIsMenuOpen(false)}
              >
                <img
                  src="https://res.cloudinary.com/dlwfuul9o/image/upload/v1755163884/register-svgrepo-com_szyit9.png"
                  alt=""
                  width={30}
                  height={30}
                />
                ลงทะเบียนสนามกีฬา
              </Link>
            </li>
          )}
        </ul>
      </aside>
    </nav>
  );
}
