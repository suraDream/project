"use client";
import React, { useState, useEffect } from "react";
import "@/app/css/register-field-form.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { usePreventLeave } from "@/app/hooks/usePreventLeave";

export default function RegisterFieldForm() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter("");
  const [sports, setSports] = useState([]);
  const [subFields, setSubFields] = useState([]);
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherFacility, setOtherFacility] = useState({ name: "", price: "", quantity: "" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const { user, isLoading } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [startProcessLoad, setStartProcessLoad] = useState(false);
  const DEFAULT_FACILITIES = [
    { fac_name: "ห้องน้ำ" },
    { fac_name: "ที่จอดรถ" },
    { fac_name: "Wi-Fi" },
    { fac_name: "โดม" },
    { fac_name: "ร้านค้า" },
    { fac_name: "ตู้แช่" },
    { fac_name: "พัดลม" },
    { fac_name: "แอร์" },
    { fac_name: "ห้องแต่งตัว" },
    { fac_name: "ลำโพง" }
  ];
  const [facilities, setFacilities] = useState(DEFAULT_FACILITIES);
  const [selectedFacilities, setSelectedFacilities] = useState({});
 


  // ฟังก์ชันยืนยันสิ่งอำนวยความสะดวกอื่นๆ
  const handleOtherFacilityConfirm = () => {
    const name = otherFacility.name.trim();
    if (!name) {
      setMessage("กรุณากรอกชื่อสิ่งอำนวยความสะดวก");
      setMessageType("error");
      return;
    }
    // ถ้ายังไม่มีใน facilities ให้เพิ่มเข้าไป
    if (!facilities.some(f => f.fac_name === name)) {
      setFacilities(prev => [...prev, { fac_name: name }]);
    }
    setSelectedFacilities(prev => ({
      ...prev,
      [name]: {
        price: otherFacility.price,
        quantity: otherFacility.quantity,
        imageFile: null,
        preview: null
      }
    }));
    setOtherFacility({ name: "", price: "", quantity: "" });
    setOtherChecked(false);
    setMessage("");
    setMessageType("");
  };

  usePreventLeave(startProcessLoad);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
    }
    if (user?.status !== "ตรวจสอบแล้ว") {
      router.replace("/verification");
    }
    if (subFields.length === 0) {
      setSubFields([
        {
          name: "",
          price: "",
          sport_id: "",
          user_id: user.user_id,
          addOns: [],
          wid_field: "",
          length_field: "",
          players_per_team: "",
          field_surface: "",
        },
      ]);
    }
  }, [user, isLoading, router]);

  const [fieldData, setFieldData] = useState({
    field_name: "",
    address: "",
    gps_location: "",
    documents: null,
    open_hours: "",
    close_hours: "",
    img_field: null,
    preview_img: null,
    number_bank: "",
    account_holder: "",
    price_deposit: "",
    name_bank: "",
    selectedSport: "",
    depositChecked: false,
    open_days: [],
    field_description: "",
    cancel_hours: 0,
    slot_duration: "",
  });

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await fetch(`${API_URL}/sports_types`, {
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok) {
          setSports(data);
        } else {
          console.error("โหลดไม่สำเร็จ:", data.error);
          setMessage("ไม่สามารถโหลดข้อมูลกีฬาได้");
          setMessageType("error");
        }
      } catch (error) {
        console.error("เชื่อมต่อกับเซิร์ฟเวอร์ไม่ได้:", error);
        setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        setMessageType("error");
      } finally {
        setDataLoading(false);
      }
    };

    fetchSports();
  }, []);

  const handleFieldChange = (e) => {
    setFieldData({ ...fieldData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    const { checked } = e.target;
    setFieldData({
      ...fieldData,
      depositChecked: checked,
      price_deposit: checked ? fieldData.price_deposit : "0",
    });
  };

  const handlePriceChange = (e) => {
    let value = e.target.value;

    value = value.replace(/\D/g, "");

    if (value.length >= 7) {
      setMessage("ใส่ได้ไม่เกิน 6 หลัก");
      setMessageType("error");
      return;
    }

    setFieldData({
      ...fieldData,
      price_deposit: value,
    });
  };

  useEffect(() => {
    if (!fieldData.depositChecked && fieldData.price_deposit === "") {
      setFieldData((prevState) => ({
        ...prevState,
        price_deposit: "0",
      }));
    }
  }, [fieldData.depositChecked]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const handleimgChange = (e) => {
    const file = e.target.files[0];
    if (file.size > MAX_FILE_SIZE) {
      setMessage("ไฟล์รูปภาพมีขนาดใหญ่เกินไป (สูงสุด 5MB)");
      setMessageType("error");
      e.target.value = null;
      return;
    }
    if (file) {
      if (file.type.startsWith("image/")) {
        setFieldData({
          ...fieldData,
          img_field: file,
          imgPreview: URL.createObjectURL(file),
        });
      } else {
        e.target.value = null;
        setMessage("โปรดเลือกเฉพาะไฟล์รูปภาพเท่านั้น");
        setMessageType("error");
      }
    }
  };

  const MAX_FILES = 10;
  const handleFileChange = (e) => {
    const files = e.target.files;
    let isValid = true;

    if (files.length > MAX_FILES) {
      setMessage(`คุณสามารถอัพโหลดได้สูงสุด ${MAX_FILES} ไฟล์`);
      setMessageType("error");
      e.target.value = null;
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = file.type;

      if (file.size > MAX_FILE_SIZE) {
        isValid = false;
        setMessage("ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)");
        setMessageType("error");
        e.target.value = null;
        break;
      }

      if (!fileType.startsWith("image/") && fileType !== "application/pdf") {
        isValid = false;
        setMessage("โปรดเลือกเฉพาะไฟล์รูปภาพหรือ PDF เท่านั้น");
        setMessageType("error");
        break;
      }
    }

    if (isValid) {
      setFieldData({ ...fieldData, documents: files });
    } else {
      e.target.value = null;
    }
  };

  const handleFacilityChange = (facId) => {
    setSelectedFacilities(prev => {
      const copy = { ...prev };
      if (copy[facId]) {
        if (copy[facId].preview) URL.revokeObjectURL(copy[facId].preview);
        delete copy[facId];
      } else {
        copy[facId] = { price:"", quantity:"", imageFile:null, preview:null };
      }
      return copy;
    });
  }; //.ใหม่
  const handleFacilityImageChange = (facId, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("ไฟล์ต้องเป็นรูปภาพ");
      setMessageType("error");
      return;
    }
    if (file.size > 5*1024*1024) {
      setMessage("รูปสูงสุด 5MB");
      setMessageType("error");
      return;
    }
    setSelectedFacilities(prev=>{
      const cur = prev[facId] || { price:"", quantity:"", imageFile:null, preview:null };
      if (cur.preview) URL.revokeObjectURL(cur.preview);
      return {
        ...prev,
        [facId]: { ...cur, imageFile:file, preview:URL.createObjectURL(file) }
      };
    });
  };

  const handleRemoveFacilityImage = (facId) => {
    setSelectedFacilities(prev=>{
      const cur = prev[facId];
      if (!cur) return prev;
      if (cur.preview) URL.revokeObjectURL(cur.preview);
      return {
        ...prev,
        [facId]: { ...cur, imageFile:null, preview:null }
      };
    });
  };

const handleFacilityPriceChange = (facId, value) => {
    setSelectedFacilities(prev => ({
      ...prev,
      [facId]: { ...(prev[facId]||{ quantity:"" }), price: value }
    }));
  };

  const handleFacilityQuantityChange = (facId, value) => {
    setSelectedFacilities(prev => ({
      ...prev,
      [facId]: { ...(prev[facId]||{ price:"" }), quantity: value }
    }));
  };


  const addSubField = () => {
    setSubFields([
      ...subFields,
      {
        name: "",
        price: "",
        sport_id: "",
        user_id: user.user_id,
        addOns: [],
        wid_field: "",
        length_field: "",
        players_per_team: "",
        field_surface: "",
      },
    ]);
  };

  const removeSubField = (index) => {
    setSubFields(subFields.filter((_, i) => i !== index));
  };

  const updateSubField = (index, key, value) => {
    const updatedSubFields = [...subFields];
    updatedSubFields[index][key] = value;
    setSubFields(updatedSubFields);
  };

  const addAddOn = (subIndex) => {
    const updatedSubFields = [...subFields];
    updatedSubFields[subIndex].addOns.push({ content: "", price: "" });
    setSubFields(updatedSubFields);
  };

  const updateAddOn = (subIndex, addOnIndex, key, value) => {
    const updatedSubFields = [...subFields];
    updatedSubFields[subIndex].addOns[addOnIndex][key] = value;
    setSubFields(updatedSubFields);
  };

  const removeAddOn = (subIndex, addOnIndex) => {
    const updatedSubFields = [...subFields];
    updatedSubFields[subIndex].addOns.splice(addOnIndex, 1);
    setSubFields(updatedSubFields);
  };

  const handleAccountTypeChange = (e) => {
    const value = e.target.value;

    setFieldData({
      ...fieldData,
      account_type: value,
      name_bank: value === "พร้อมเพย์" ? "พร้อมเพย์" : fieldData.name_bank,
    });
  };

 const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setMessage("กรุณาเข้าสู่ระบบก่อน!");
      setMessageType("error");
      return;
    }

    const userId = user.user_id;

    // ตรวจสอบข้อมูลที่กรอกให้ครบถ้วน
    if (
      !fieldData.field_name ||
      !fieldData.address ||
      !fieldData.gps_location ||
      !fieldData.open_hours ||
      !fieldData.close_hours ||
      !fieldData.number_bank ||
      !fieldData.account_holder ||
      !fieldData.price_deposit ||
      !fieldData.name_bank ||
      !fieldData.field_description ||
      !fieldData.slot_duration
    ) {
      setMessage("กรุณากรอกข้อมูลให้ครบถ้วน");
      setMessageType("error");
      return;
    }

    if (fieldData.open_days.length === 0) {
      setMessage("กรุณาเลือกวันเปิดบริการ");
      setMessageType("error");
      return;
    }

    for (let sub of subFields) {
      if (
        !sub.name ||
        !sub.sport_id ||
        !sub.players_per_team ||
        !sub.wid_field ||
        !sub.length_field ||
        !sub.field_surface
      ) {
        setMessage("กรุณากรอกข้อมูลให้ครบถ้วนสำหรับสนามย่อยทุกสนาม");
        setMessageType("error");
        return;
      }
    }

    if (!fieldData.documents || !fieldData.img_field) {
      setMessage("กรุณาเลือกเอกสารและรูปโปรไฟล์สนาม");
      setMessageType("error");
      return;
    }

    const selectedFacs = Object.keys(selectedFacilities);
    if (selectedFacs.length === 0) {
      setMessage("กรุณาเลือกสิ่งอำนวยความสะดวก");
      setMessageType("error");
      return;
    }
    for (const id of selectedFacs) {
      const fac = selectedFacilities[id];
      if (fac.price === "" || fac.quantity === "") {
        setMessage("กรุณากรอกราคาและจำนวนสิ่งอำนวยความสะดวก");
        setMessageType("error");
        return;
      }
    }

    // สร้าง facilitiesPayload จาก selectedFacilities (ไม่รวมไฟล์)
    const facilitiesPayload = {};
    selectedFacs.forEach(id => {
      const { price, quantity } = selectedFacilities[id];
      facilitiesPayload[id] = { 
        price: String(price), 
        quantity_total: String(quantity) 
      };
    });

    const formData = new FormData();
    
    // เอกสาร
    if (fieldData.documents && fieldData.documents.length > 0) {
      for (let i = 0; i < fieldData.documents.length; i++) {
        formData.append("documents", fieldData.documents[i]);
      }
    }
    
    // รูปโปรไฟล์สนาม
    formData.append("img_field", fieldData.img_field);
    
    // รูปสิ่งอำนวยความสะดวก
    for (const id of selectedFacs) {
      const f = selectedFacilities[id];
      if (f.imageFile) {
        formData.append(`facility_image_${id}`, f.imageFile);
      }
    }
    
    // แนบ JSON data
    formData.append(
      "data",
      JSON.stringify({
        user_id: userId,
        field_name: fieldData.field_name,
        address: fieldData.address,
        gps_location: fieldData.gps_location,
        open_hours: fieldData.open_hours,
        close_hours: fieldData.close_hours,
        number_bank: fieldData.number_bank,
        account_holder: fieldData.account_holder,
        price_deposit: fieldData.depositChecked ? fieldData.price_deposit : "0",
        name_bank: fieldData.name_bank,
        status: fieldData.status || "รอตรวจสอบ",
        selectedFacilities: facilitiesPayload, // ใช้ facilitiesPayload ที่สร้างแล้ว
        subFields: subFields,
        open_days: fieldData.open_days,
        field_description: fieldData.field_description,
        cancel_hours: fieldData.cancel_hours || "0",
        slot_duration: parseInt(fieldData.slot_duration, 10) || 0
      })
    );

    setStartProcessLoad(true);
    try {
      const token = localStorage.getItem("auth_mobile_token");

      const res = await fetch(`${API_URL}/field/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        console.error("Error:", data.error);
        setMessage("เกิดข้อผิดพลาด: " + data.error);
        setMessageType("error");
        return;
      }
      
      setMessage("ลงทะเบียนสนามเรียบร้อยรอผู้ดูแลระบบตรวจสอบ");
      setMessageType("success");
      
      // รีเซ็ตฟอร์ม
      setFieldData({
        field_name: "",
        address: "",
        gps_location: "",
        documents: null,
        open_hours: "",
        close_hours: "",
        img_field: null,
        preview_img: null,
        number_bank: "",
        account_holder: "",
        price_deposit: "",
        name_bank: "",
        selectedSport: "",
        depositChecked: false,
        open_days: [],
        field_description: "",
        cancel_hours: "",
      });
      setSubFields([]);
      setSelectedFacilities({});
      
      setTimeout(() => {
        setMessage("");
        router.replace("");
      }, 3000);
    } catch (error) {
      console.error("Fetch Error:", error);
      setMessage("เกิดข้อผิดพลาดในการส่งข้อมูล");
      setMessageType("error");
    } finally {
      setStartProcessLoad(false); 
    }
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

  if (dataLoading)
    return (
      <div className="load">
        <span className="spinner"></span>
      </div>
    );

  return (
    <>
      {message && (
        <div className={`message-box ${messageType}`}>
          <p>{message}</p>
        </div>
      )}
      <div className="field-register-contianer">
        <div className="heder">
          <h1 className="field-register">ลงทะเบียนสนามกีฬา</h1>
        </div>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="input-group-register-field">
            {" "}
            <label>ชื่อสนามกีฬา:</label>
            <input
              type="text"
              maxLength={100}
              name="field_name"
              placeholder="ชื่อสนามของคุณ"
              value={fieldData.field_name}
              onChange={handleFieldChange}
            />
          </div>
          <div className="input-group-register-field">
            <label>ที่ตั้งสนาม:</label>
            <input
              type="text"
              maxLength={100}
              name="address"
              placeholder="ที่อยู่สนามของคุณ"
              value={fieldData.address}
              onChange={handleFieldChange}
            />
          </div>
          <div className="input-group-register-field">
            <label>พิกัด GPS:(เช่น16.05xxxxx, 103.65xxxxx)</label>{" "}
            <div className="exapmle-gps">
              <a
                href="https://support.google.com/maps/answer/18539?hl=th&co=GENIE.Platform%3DiOS&oco=0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                วิธีเอาละติจูดและลองจิจูดใน Google Maps
              </a>
              <br />
              <a
                href="https://maps.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps
              </a>
            </div>
            <input
              type="text"
              maxLength={100}
              name="gps_location"
              placeholder="พิกัด"
              value={fieldData.gps_location}
              onChange={handleFieldChange}
            />
          </div>

          <div className="datetimecon">
            <div className="time">
              <div className="input-group-register-field">
                <label>เวลาเปิด:</label>
                <input
                  type="time"
                  name="open_hours"
                  value={fieldData.open_hours}
                  onChange={handleFieldChange}
                />
              </div>

              <div className="input-group-register-field">
                <label>เวลาปิด:</label>
                <input
                  type="time"
                  name="close_hours"
                  value={fieldData.close_hours}
                  onChange={handleFieldChange}
                />

              </div>
              <div className="input-group-register-field">
                <label>ช่วงเวลาละกี่นาที:</label>
                <select name="slot_duration" value={fieldData.slot_duration} onChange={handleFieldChange}>
                  <option value="">กรุณาเลือกช่วงเวลา</option>
                  <option value="30">30 นาที</option>
                  <option value="60">60 นาที</option>

                </select>
              </div>
            </div>
            <div className="open-days-container">
              <div className="input-group-register-field">
                <label style={{ textAlign: "center" }}>
                  เลือกวันเปิดบริการ:
                </label>
              </div>
              <div className="time-selection">
                <div className="input-group-checkbox-register-field">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day, index) => (
                      <label key={index} className="checkbox-label">
                        <input
                          type="checkbox"
                          name="open_days"
                          value={day}
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setFieldData((prevData) => {
                              const openDays = new Set(prevData.open_days);
                              if (checked) {
                                openDays.add(value);
                              } else {
                                openDays.delete(value);
                              }
                              return {
                                ...prevData,
                                open_days: Array.from(openDays),
                              };
                            });
                          }}
                        />
                        {day}
                      </label>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="input-group-register-field">
            <label>ยกเลิกการจองได้ภายใน (ชั่วโมง)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              name="cancel_hours"
              placeholder="เช่น 2 = ยกเลิกได้ก่อน 2 ชม."
              value={fieldData.cancel_hours}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value > 24) {
                  setMessage("ใส่ไม่เกินไม่เกิน 24 ชั่วโมง ");
                  setMessageType("error");
                  return;
                }
                setFieldData({
                  ...fieldData,
                  cancel_hours: isNaN(value) ? 0 : value,
                });
              }}
            />
          </div>

          <div className="subfieldcon">
            {subFields.map((sub, subIndex) => (
              <div key={subIndex}>
                <div className="input-group-register-field">
                  <label htmlFor="">ชื่อสนามย่อย</label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="สนาม 1,2"
                    value={sub.name}
                    onChange={(e) =>
                      updateSubField(subIndex, "name", e.target.value)
                    }
                  />
                </div>

                <div className="input-group-register-field">
                  <label htmlFor="">ราคา/ชั่วโมง</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={7}
                    placeholder="500 , 1000"
                    value={sub.price ?? ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value.length > 6) {
                        setMessage("ราคาต้องไม่เกิน 6 หลัก ");
                        setMessageType("error");
                        return;
                      }
                      updateSubField(subIndex, "price", value);
                    }}
                  />
                </div>

                <div className="input-group-register-field">
                  <label htmlFor="">ประเภทกีฬา</label>

                  <select
                    value={sub.sport_id}
                    onChange={(e) =>
                      updateSubField(subIndex, "sport_id", e.target.value)
                    }
                  >
                    <option value="">เลือกประเภทกีฬา</option>
                    {sports.map((sport) => (
                      <option key={sport.sport_id} value={sport.sport_id}>
                        {sport.sport_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group-register-field">
                  <label htmlFor="">จำนวนผู้เล่นต่อฝั่ง</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="5, 7, 11"
                    value={sub.players_per_team ?? ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value > 11) {
                        setMessage("ใส่ได้ไม่เกิน 11 คน ");
                        setMessageType("error");
                        return;
                      }
                      updateSubField(subIndex, "players_per_team", value);
                    }}
                  />{" "}
                </div>
                <div className="input-group-register-field">
                  <label>ความกว้างของสนาม</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="(เมตร)"
                    value={sub.wid_field || ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value > 1000) {
                        setMessage("ใส่ได้ไม่เกิน 1000 เมตร");
                        setMessageType("error");
                        return;
                      }
                      updateSubField(subIndex, "wid_field", value);
                    }}
                  />
                </div>
                <div className="input-group-register-field">
                  <label>ความยาวของสนาม</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="(เมตร)"
                    value={sub.length_field || ""}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value > 1000) {
                        setMessage("ใส่ได้ไม่เกิน 1000 เมตร");
                        setMessageType("error");
                        return;
                      }
                      updateSubField(subIndex, "length_field", value);
                    }}
                  />
                </div>
                <div className="input-group-register-field">
                  <label>พื้นสนาม</label>
                  <input
                    maxLength={20}
                    type="text"
                    placeholder="เช่น หญ้าเทียม,หญ้าจริง "
                    value={sub.field_surface}
                    onChange={(e) =>
                      updateSubField(subIndex, "field_surface", e.target.value)
                    }
                  />
                </div>

                <button
                  className="addbtn-regisfield"
                  type="button"
                  onClick={() => addAddOn(subIndex)}
                >
                  เพิ่มกิจกรรมเพิ่มเติม
                </button>

                <button
                  className="delbtn-regisfield"
                  type="button"
                  onClick={() => removeSubField(subIndex)}
                >
                  ลบสนามย่อย
                </button>

                <div className="addoncon">
                  {sub.addOns.map((addon, addOnIndex) => (
                    <div key={addOnIndex}>
                      <div className="input-group-register-field">
                        <input
                          type="text"
                          maxLength={100}
                          placeholder="ชื่อกิจกรรม เช่น (เช่าสนามเพื่อทำคอนเท้น)"
                          value={addon.content}
                          onChange={(e) =>
                            updateAddOn(
                              subIndex,
                              addOnIndex,
                              "content",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="input-group-register-field">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={7}
                          placeholder="ราคา/ชั่วโมง"
                          value={addon.price || ""}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, "");
                            if (value > 999999) {
                              setMessage("ใส่ได้ไม่เกิน 6 หลัก ");
                              setMessageType("error");
                              return;
                            }
                            updateAddOn(subIndex, addOnIndex, "price", value);
                          }}
                        />
                      </div>

                      <button
                        className="delevn"
                        type="button"
                        onClick={() => removeAddOn(subIndex, addOnIndex)}
                      >
                        ลบกิจกรรมเพิ่มเติม
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              className="addsubfield-regisfield"
              type="button"
              onClick={addSubField}
            >
              + เพิ่มสนามย่อย
            </button>
          </div>
          <div className="input-group-register-field">
            <label htmlFor="img_field">รูปโปรไฟล์สนาม</label>

            <input type="file" onChange={handleimgChange} accept="image/*" />
          </div>

          {fieldData.imgPreview && (
            <div className="preview-container-regis-field">
              <p>ตัวอย่างรูป:</p>
              <img src={fieldData.imgPreview} alt="Preview" />
            </div>
          )}

          <div className="input-group-register-field">
            <label htmlFor="documents">
              เอกสาร หรือรูป (เพิ่มได้สูงสุด 10 ไฟล์)
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              multiple
            />
          </div>

          <div className="input-group-register-field">
            <label htmlFor="account-type">เลือกประเภทบัญชี</label>
            <select
              name="account_type"
              value={fieldData.account_type}
              onChange={handleAccountTypeChange}
            >
              <option value="">กรุณาเลือกบัญชี</option>
              <option value="ธนาคาร">ธนาคาร</option>
              <option value="พร้อมเพย์">พร้อมเพย์</option>
            </select>
          </div>

          <div className="input-group-register-field">
            <label htmlFor="number_bank">เลขบัญชีธนาคาร / พร้อมเพย์</label>
            <input
              type="text"
              maxLength={13}
              inputMode="numeric"
              pattern="[0-9]*"
              name="number_bank"
              placeholder="เลขบัญชีและพร้อมเพย์ 10 หลัก หรือ 13 หลัก หลักเท่านั้น"
              value={fieldData.number_bank || ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setMessage("");
                const isPromptPay = fieldData.account_type === "พร้อมเพย์";

                if (/^\d*$/.test(value)) {
                  if (
                    (isPromptPay && value.length <= 13) ||
                    (!isPromptPay && value.length <= 12)
                  ) {
                    setFieldData({ ...fieldData, number_bank: value });
                  }
                }
              }}
              onBlur={() => {
                const isPromptPay = fieldData.account_type === "พร้อมเพย์";
                const length = fieldData.number_bank.length;

                if (
                  (!isPromptPay && length !== 10 && length !== 12) ||
                  (isPromptPay && length !== 10 && length !== 13)
                ) {
                  setMessage(
                    "เลขที่กรอกไม่ถูกต้อง เลขบัญชีและพร้อมเพย์ 10 หลัก หรือ 13 หลัก หลักเท่านั้น"
                  );
                  setMessageType("error");
                  setFieldData({ ...fieldData, number_bank: "" });
                }
              }}
            />
          </div>

          {fieldData.account_type === "ธนาคาร" && (
            <div className="input-group-register-field">
              <label htmlFor="bank">ชื่อธนาคาร</label>
              <input
                type="text"
                maxLength={50}
                name="name_bank"
                placeholder="ชื่อธนาคาร"
                value={fieldData.name_bank}
                onChange={handleFieldChange}
              />
            </div>
          )}

          {fieldData.account_type === "พร้อมเพย์" && (
            <div className="input-group-register-field">
              <label htmlFor="bank">ชื่อธนาคาร</label>
              <input
                type="text"
                maxLength={50}
                name="name_bank"
                value="พร้อมเพย์"
                disabled
              />
            </div>
          )}

          <div className="input-group-register-field">
            <label htmlFor="bank">ชื่อเจ้าของบัญชีธนาคาร</label>
            <input
              type="text"
              maxLength={50}
              name="account_holder"
              placeholder="ชื่อเจ้าของบัญชี"
              value={fieldData.account_holder}
              onChange={handleFieldChange}
            />
          </div>
          <div>
            <div className="input-group-register-field">
              <label>ค่ามัดจำ</label>
            </div>
            <div className="depositcon-regisfield">
              <div className="input-group-checkbox-register-field">
                <input
                  type="checkbox"
                  checked={fieldData.depositChecked}
                  onChange={handleCheckboxChange}
                />
                <div className="input-group-deposit-regisfield">
                  <label>เก็บค่ามัดจำ</label>
                </div>
              </div>
              {fieldData.depositChecked && (
                <div className="input-group-register-field">
                  <input
                    type="text"
                    name="price_deposit"
                    placeholder="กำหนดค่ามัดจำ"
                    value={fieldData.price_deposit || "0"}
                    onChange={handlePriceChange}
                    maxLength={7}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onKeyDown={(e) => {
                      if (e.key === "-") {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="input-group-register-field">
            <label>สิ่งอำนวยความสะดวก</label>
          </div>
                   <div className="factcon-register-field">
            {facilities.map((fac) => {
              const key = fac.fac_name; // ใช้ fac_name เป็น key
              return (
                <div key={key} className="facility-item-register-field">
                  {/* Checkbox เลือกสิ่งอำนวยความสะดวก */}
                  <div className="input-group-checkbox-register-field">
                    <input
                      type="checkbox"
                      checked={selectedFacilities[key] !== undefined}
                      onChange={() => handleFacilityChange(key)}
                    />
                    <label>{fac.fac_name}</label>
                  </div>

                  {/* ป้อนราคาเมื่อเลือกสิ่งอำนวยความสะดวก */}
                  {selectedFacilities[key] !== undefined && (
                    <div className="input-group-register-field">
                      <div className="input-group-checkbox-register-field" style={{flexWrap:"wrap", gap:"8px"}}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={7}
                          placeholder="กำหนดราคา ถ้าไม่มีใส่ '0'"
                          value={selectedFacilities[key]?.price ?? ""}
                          onChange={(e)=> {
                            let v = e.target.value.replace(/\D/g,"").slice(0,6);
                            handleFacilityPriceChange(key, v);
                          }}
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          placeholder="จำนวน"
                          value={selectedFacilities[key]?.quantity ?? ""}
                          onChange={(e)=> {
                            let v = e.target.value.replace(/\D/g,"").slice(0,3);
                            handleFacilityQuantityChange(key, v);
                          }}
                        /> 
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e=>handleFacilityImageChange(key, e.target.files?.[0])}
                          style={{maxWidth:"200px"}}
                        />
                        {selectedFacilities[key]?.preview && (
                          <div style={{display:"flex", alignItems:"center", gap:"6px"}}>
                            <img
                              src={selectedFacilities[key].preview}
                              alt="facility"
                              style={{width:"70px", height:"50px", objectFit:"cover", border:"1px solid #ccc", borderRadius:"4px"}}
                            />
                            <button
                              type="button"
                              style={{background:"#f44336", color:"#fff", border:"none", padding:"4px 8px", cursor:"pointer", borderRadius:"4px"}}
                              onClick={()=>handleRemoveFacilityImage(key)}
                            >
                              ลบรูป
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="input-group-register-field">
            <label>
              <input
                type="checkbox"
                checked={otherChecked}
                onChange={e => {
                  setOtherChecked(e.target.checked);
                  setMessage("");
                  setMessageType("");
                }}
              />
              อื่นๆ
            </label>
          </div>
          {otherChecked && (
            <div className="input-group-register-field" style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              <input
                type="text"
                maxLength={100}
                placeholder="ชื่อสิ่งอำนวยความสะดวก"
                value={otherFacility.name}
                onChange={e => setOtherFacility(f => ({...f, name: e.target.value}))}
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={7}
                placeholder="ราคา"
                value={otherFacility.price}
                onChange={e => setOtherFacility(f => ({...f, price: e.target.value.replace(/\D/g,"").slice(0,6)}))}
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="จำนวน"
                value={otherFacility.quantity}
                onChange={e => setOtherFacility(f => ({...f, quantity: e.target.value.replace(/\D/g,"").slice(0,3)}))}
              />
              <button
                type="button"
                className="savebtn-regisfield"
                style={{cursor: startProcessLoad ? "not-allowed" : "pointer"}}
                disabled={startProcessLoad}
                onClick={handleOtherFacilityConfirm}
              >
                ยืนยัน
              </button>
            </div>
          )}
          <div className="input-group-register-field">
            <label>คำแนะนำของสนาม</label>
            <div className="textarea">
              <textarea
                maxLength={256}
                name="field_description"
                placeholder="ใส่รายละเอียดสนาม หมายเหตุต่างๆ เช่นสนามหญ้าเทียม 7 คน "
                value={fieldData.field_description}
                onChange={handleFieldChange}
              />
            </div>
          </div>
          <button
            className="submitbtn-regisfield"
            style={{
              cursor: startProcessLoad ? "not-allowed" : "pointer",
            }}
            disabled={startProcessLoad}
            type="submit"
          >
            {startProcessLoad ? (
              <span className="dot-loading">
                <span className="dot one">●</span>
                <span className="dot two">●</span>
                <span className="dot three">● </span>
              </span>
            ) : (
              "บันทึก"
            )}
          </button>
        </form>
      </div>
    </>
  );
}
