import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send,
  RotateCcw,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Bus,
  Users,
  MapPin,
  Clock,
  Loader2,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import {
  TargetRombonganType,
  TARGET_LABELS,
  ChatMessage,
  RundownItem,
  callGeminiChat,
  parseRundownFromText,
} from "@/utils/asistenWisataAI";

const POPULAR_DESTINATIONS = [
  "Yogyakarta",
  "Semarang",
  "Demak & Kudus",
  "Solo",
  "Malang & Batu",
  "Bandung",
  "Bali",
  "Surabaya",
  "Dieng & Wonosobo",
  "Jakarta",
  "Pacitan",
];

const INITIAL_SUGGESTIONS = [
  {
    label: "Rundown 1 Hari Ziarah Demak & Kudus",
    desc: "Jadwal makam Sunan Kalijaga & Sunan Kudus, waktu sholat, dan rumah makan bus besar",
    prompt:
      "Buatkan rundown lengkap 1 hari ziarah makam Sunan Kalijaga dan Sunan Kudus untuk rombongan Big Bus, termasuk jadwal sholat dan resto prasmanan.",
    target: "ziarah" as TargetRombonganType,
    kota: "Demak & Kudus",
  },
  {
    label: "Study Tour SMP ke Yogyakarta (Big Bus)",
    desc: "Susunan acara 1 hari penuh beserta lokasi parkir bus dan pusat oleh-oleh",
    prompt:
      "Susun itinerary 1 hari study tour pelajar SMP di Yogyakarta dengan armada Big Bus, lengkap dengan jam, akses parkir bus, dan resto rombongan.",
    target: "smp" as TargetRombonganType,
    kota: "Yogyakarta",
  },
  {
    label: "Rekomendasi Resto & Wisata Ramah Bus Semarang",
    desc: "Daftar rumah makan prasmanan kapasitas 200+ orang dan wisata akses bus besar",
    prompt:
      "Rekomendasikan destinasi wisata ramah bus pariwisata besar serta restoran prasmanan kapasitas 200+ pax di Semarang dengan parkir luas.",
    target: "keluarga_umum" as TargetRombonganType,
    kota: "Semarang",
  },
  {
    label: "Perhitungan BBM Solar & Tol Semarang - Jogja",
    desc: "Perkiraan kebutuhan biaya operasional jalan dan tarif tol Trans Jawa PP",
    prompt:
      "Hitung perkiraan biaya BBM solar dan tarif tol Trans Jawa untuk Big Bus rute Semarang - Yogyakarta (PP) 1 hari perjalanan.",
    target: "kantoran" as TargetRombonganType,
    kota: "Yogyakarta",
  },
];

const QUICK_TOPICS = [
  "Rumah makan prasmanan parkir bus luas",
  "Pusat oleh-oleh ramah Big Bus",
  "Susun jadwal acara 1 hari penuh",
  "Info jalur rawan tanjakan & alternatif",
];

const AsistenAI = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripIdParam = searchParams.get("tripId");

  // Parameter Konteks Perjalanan
  const [targetRombongan, setTargetRombongan] = useState<TargetRombonganType>("smp");
  const [kotaTujuan, setKotaTujuan] = useState("Yogyakarta");
  const [customCityInput, setCustomCityInput] = useState("");
  const [durasiHari, setDurasiHari] = useState<"1" | "2" | "3">("1");
  const [armadaBus, setArmadaBus] = useState<"big_bus" | "medium_bus" | "microbus">("big_bus");

  // State Percakapan
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Daftar Trip untuk simpan rundown langsung
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const cached = localStorage.getItem("catatbiro_cached_trips");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTrips(parsed);
            const targetId = tripIdParam || localStorage.getItem("active_trip_id");
            if (targetId && parsed.some((t: any) => t.id === targetId)) {
              setSelectedTripId(targetId);
              const active = parsed.find((t: any) => t.id === targetId);
              if (active?.tujuan) setKotaTujuan(active.tujuan);
            } else if (parsed[0]) {
              setSelectedTripId(parsed[0].id);
              if (parsed[0].tujuan) setKotaTujuan(parsed[0].tujuan);
            }
          }
        }

        const user = await getActiveUser();
        if (!user) return;

        const { data } = await supabase
          .from("trips")
          .select("id, nama_trip, tujuan, tanggal")
          .order("tanggal", { ascending: false });

        if (data && data.length > 0) {
          setTrips(data);
          const targetId = tripIdParam || selectedTripId || data[0].id;
          const targetTrip = data.find((t: any) => t.id === targetId) || data[0];
          setSelectedTripId(targetTrip.id);
          if (targetTrip?.tujuan) setKotaTujuan(targetTrip.tujuan);
        }
      } catch (e) {
        console.warn("Gagal memuat daftar trip:", e);
      }
    };

    fetchTrips();
  }, [tripIdParam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleResetChat = () => {
    setMessages([]);
    setInputText("");
    toast.info("Percakapan dibersihkan.");
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText("");
    setLoading(true);

    try {
      const reply = await callGeminiChat(
        newHistory
          .filter((m) => !m.isError)
          .map((m) => ({ role: m.role, content: m.content })),
        {
          targetRombongan,
          kotaTujuan,
          durasiHari,
          armadaBus,
        }
      );

      const parsedRundown = parseRundownFromText(reply);

      const assistantMessage: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
        parsedRundown: parsedRundown.length >= 1 ? parsedRundown : undefined,
      };

      setMessages([...newHistory, assistantMessage]);
    } catch (err: any) {
      toast.error("Gagal menghubungi layanan asisten: " + (err.message || "Koneksi terputus"));
      setMessages([
        ...newHistory,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Maaf, koneksi sedang sibuk atau terputus. Silakan ulangi pertanyaan Anda.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRundown = (msgId: string, items: RundownItem[]) => {
    const text = items
      .map(
        (it) =>
          `• ${it.jamMulai} - ${it.jamSelesai}: ${it.kegiatan}${
            it.lokasi ? ` [${it.lokasi}]` : ""
          }${it.keterangan ? ` (${it.keterangan})` : ""}`
      )
      .join("\n");

    const targetTitle = TARGET_LABELS[targetRombongan]?.title || targetRombongan;
    const fullContent = `RUNDOWN ACARA PERJALANAN\nTujuan: ${kotaTujuan}\nKategori: ${targetTitle}\n\n${text}`;

    navigator.clipboard.writeText(fullContent);
    setCopiedId(msgId);
    toast.success("Rundown berhasil disalin ke clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyRundownToTrip = async (items: RundownItem[]) => {
    if (!selectedTripId) {
      toast.error("Pilih trip terlebih dahulu pada bagian atas");
      return;
    }

    setIsApplying(true);
    try {
      const user = await getActiveUser();
      if (!user) throw new Error("Pengguna belum login");

      const rowsToInsert = items.map((it) => ({
        trip_id: selectedTripId,
        user_id: user.id,
        hari_ke: 1,
        jam_mulai: it.jamMulai || "08:00",
        jam_selesai: it.jamSelesai || "09:00",
        judul_acara: it.lokasi ? `${it.kegiatan} - ${it.lokasi}` : it.kegiatan,
        keterangan: it.keterangan || null,
      }));

      const { error } = await supabase.from("rundown_acara").insert(rowsToInsert);
      if (error) throw error;

      toast.success(`${items.length} jadwal acara berhasil disimpan ke Rundown Trip`);
    } catch (err: any) {
      toast.error("Gagal menyimpan rundown: " + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const destinationList = POPULAR_DESTINATIONS.includes(kotaTujuan)
    ? POPULAR_DESTINATIONS
    : [kotaTujuan, ...POPULAR_DESTINATIONS];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:pl-64 pb-20 lg:pb-6 flex flex-col font-sans text-slate-900 dark:text-slate-100">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex-1 flex flex-col">
          {/* Header Sederhana & Bersih */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="lg:hidden h-9 w-9 rounded-lg border-slate-200 dark:border-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Asisten Rute & Penyusun Rundown
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bantuan cepat penyusunan jadwal perjalanan, estimasi waktu tempuh, dan referensi rumah makan bus pariwisata.
                </p>
              </div>
            </div>

            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChat}
                className="h-9 px-3 text-xs font-medium rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1.5 self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Mulai Baru</span>
              </Button>
            )}
          </div>

          {/* Bar Parameter Ringkas (1 Baris Rapi, Tidak Membingungkan) */}
          <div className="my-4 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Hubungkan Trip */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target Trip (Untuk Simpan Rundown)
                </label>
                {trips.length > 0 ? (
                  <Select
                    value={selectedTripId}
                    onValueChange={(val) => {
                      setSelectedTripId(val);
                      const sel = trips.find((t) => t.id === val);
                      if (sel?.tujuan) setKotaTujuan(sel.tujuan);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih trip..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.nama_trip} ({t.tujuan})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center text-xs text-slate-500">
                    Belum ada jadwal trip
                  </div>
                )}
              </div>

              {/* 2. Kota Tujuan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kota / Area Tujuan
                </label>
                <div className="flex gap-1.5">
                  <Select value={kotaTujuan} onValueChange={setKotaTujuan}>
                    <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationList.map((city) => (
                        <SelectItem key={city} value={city} className="text-xs">
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={customCityInput}
                    onChange={(e) => setCustomCityInput(e.target.value)}
                    placeholder="Kota lain..."
                    className="h-9 w-28 text-xs rounded-lg border-slate-200 dark:border-slate-800"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customCityInput.trim()) {
                        e.preventDefault();
                        setKotaTujuan(customCityInput.trim());
                        setCustomCityInput("");
                      }
                    }}
                  />
                </div>
              </div>

              {/* 3. Kategori Rombongan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Jenis Rombongan
                </label>
                <Select
                  value={targetRombongan}
                  onValueChange={(val) => setTargetRombongan(val as TargetRombonganType)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TARGET_LABELS) as TargetRombonganType[]).map((key) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {TARGET_LABELS[key].title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Durasi & Armada */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Durasi
                  </label>
                  <Select value={durasiHari} onValueChange={(v: any) => setDurasiHari(v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">1 Hari</SelectItem>
                      <SelectItem value="2" className="text-xs">2 Hari</SelectItem>
                      <SelectItem value="3" className="text-xs">3 Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Armada
                  </label>
                  <Select value={armadaBus} onValueChange={(v: any) => setArmadaBus(v)}>
                    <SelectTrigger className="h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="big_bus" className="text-xs">Big Bus</SelectItem>
                      <SelectItem value="medium_bus" className="text-xs">Medium Bus</SelectItem>
                      <SelectItem value="microbus" className="text-xs">HiAce / Elf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Area Utama Diskusi & Hasil Rundown */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden min-h-[460px]">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="max-w-3xl mx-auto py-4 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Pilih Contoh Kebutuhan Operasional atau Ketik Pertanyaan
                    </h2>
                    <p className="text-xs text-slate-500">
                      Sistem akan menyusun draf jadwal acara, rekomendasi tempat makan rombongan, atau estimasi perjalanan sesuai parameter di atas.
                    </p>
                  </div>

                  {/* 4 Kartu Template Bersih Tanpa Gradasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INITIAL_SUGGESTIONS.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTargetRombongan(sug.target);
                          setKotaTujuan(sug.kota);
                          handleSendMessage(sug.prompt);
                        }}
                        className="text-left p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {sug.label}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex-shrink-0">
                            {sug.kota}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {sug.desc}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Topik Cepat */}
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">
                      Topik pencarian cepat untuk tujuan {kotaTujuan}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TOPICS.map((topic, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(`${topic} di ${kotaTujuan}`)}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {isUser ? "Anda" : "Asisten Operasional"}
                        </span>
                      </div>

                      <div
                        className={`max-w-3xl w-full sm:w-auto p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                            : msg.isError
                            ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200"
                            : "bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {/* Tabel Rundown Terstruktur jika Terdeteksi */}
                        {msg.parsedRundown && msg.parsedRundown.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Draf Rundown Terdeteksi ({msg.parsedRundown.length} Jadwal)
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopyRundown(msg.id, msg.parsedRundown!)}
                                  className="h-8 px-2.5 text-xs font-medium rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 gap-1.5"
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Salin Teks</span>
                                    </>
                                  )}
                                </Button>

                                {selectedTripId && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApplyRundownToTrip(msg.parsedRundown!)}
                                    disabled={isApplying}
                                    className="h-8 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                                  >
                                    {isApplying ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Simpan ke Rundown Trip</span>
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    <th className="py-2 px-3 font-semibold w-28">Jam</th>
                                    <th className="py-2 px-3 font-semibold">Kegiatan & Lokasi</th>
                                    <th className="py-2 px-3 font-semibold">Keterangan</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {msg.parsedRundown.map((item, i) => (
                                    <tr key={i}>
                                      <td className="py-2 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                        {item.jamMulai} - {item.jamSelesai}
                                      </td>
                                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                                        {item.kegiatan}
                                        {item.lokasi && item.lokasi !== item.kegiatan ? (
                                          <span className="text-slate-500"> — {item.lokasi}</span>
                                        ) : null}
                                      </td>
                                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                                        {item.keterangan || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 w-fit">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700 dark:text-slate-300" />
                  <span>Menyusun informasi rute dan jadwal...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Form Input Bawah */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Tulis pertanyaan rute, rumah makan, atau instruksi rundown tujuan ${kotaTujuan}...`}
                  className="h-10 text-xs sm:text-sm rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 flex-shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim</span>
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default AsistenAI;
