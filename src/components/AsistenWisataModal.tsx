import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Compass,
  Send,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Bus,
  Users,
  MapPin,
  Clock,
  Loader2,
  ChevronDown,
  X,
  Building2,
  GraduationCap,
  School,
  Heart,
  Landmark,
} from "lucide-react";
import {
  TargetRombonganType,
  TARGET_LABELS,
  ChatMessage,
  RundownItem,
  callGeminiChat,
  parseRundownFromText,
} from "@/utils/asistenWisataAI";

interface AsistenWisataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTripRoute?: (tripData: {
    nama: string;
    tujuan: string;
    rundown?: RundownItem[];
  }) => void;
  currentTrip?: {
    id: string;
    nama_trip: string;
    tujuan: string;
    tanggal?: string;
  } | null;
  onApplyRundownToCurrentTrip?: (rundown: RundownItem[]) => Promise<void> | void;
}

const POPULAR_DESTINATIONS = [
  "Semarang",
  "Yogyakarta",
  "Demak & Kudus",
  "Solo",
  "Malang & Batu",
  "Bandung",
  "Bali",
  "Surabaya",
  "Dieng & Wonosobo",
  "Jakarta",
];

const TARGET_ICONS: Record<TargetRombonganType, any> = {
  tk_sd: School,
  smp: GraduationCap,
  sma_smk: Landmark,
  univ: Building2,
  kantoran: Building2,
  ziarah: Heart,
  keluarga_umum: Users,
};

const INITIAL_SUGGESTIONS = [
  {
    label: "Rundown 1 Hari Ziarah Demak & Kudus",
    prompt: "Buatkan rundown lengkap 1 hari ziarah makam Sunan Kalijaga dan Sunan Kudus untuk rombongan Big Bus, termasuk jadwal sholat dan resto prasmanan.",
    target: "ziarah" as TargetRombonganType,
    kota: "Demak & Kudus",
  },
  {
    label: "Study Tour SMP di Jogja (Big Bus)",
    prompt: "Susun itinerary 1 hari study tour pelajar SMP di Yogyakarta dengan armada Big Bus, lengkap dengan jam, akses parkir bus, dan resto rombongan.",
    target: "smp" as TargetRombonganType,
    kota: "Yogyakarta",
  },
  {
    label: "Resto Bus Besar & Wisata di Semarang",
    prompt: "Rekomendasikan destinasi wisata ramah bus pariwisata besar serta restoran prasmanan kapasitas 200+ pax di Semarang dengan parkir luas.",
    target: "keluarga_umum" as TargetRombonganType,
    kota: "Semarang",
  },
  {
    label: "Family Gathering Kantor di Malang/Batu",
    prompt: "Buatkan rundown 2 hari 1 malam gathering kantor di Batu Malang untuk 60 orang karyawan, fokus team building santai dan kuliner khas.",
    target: "kantoran" as TargetRombonganType,
    kota: "Malang & Batu",
  },
];

/**
 * Komponen Markdown Ringkas & Bersih untuk Tampilan Mobile
 */
const MarkdownView = ({ content }: { content: string }) => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  const renderInline = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong
            key={match.index}
            className="font-semibold text-slate-900 dark:text-slate-100"
          >
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={match.index} className="italic">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      elements.push(<div key={`blank-${idx}`} className="h-1.5" />);
      continue;
    }

    // Deteksi tabel Markdown (| col | col |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (
        idx < lines.length &&
        lines[idx].trim().startsWith("|") &&
        lines[idx].trim().endsWith("|")
      ) {
        tableLines.push(lines[idx].trim());
        idx++;
      }
      idx--; // Koreksi kenaikan loop

      const validRows = tableLines.filter((tl) => !tl.includes("---"));
      if (validRows.length > 0) {
        const headerRow = validRows[0]
          .split("|")
          .map((c) => c.trim())
          .filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const dataRows = validRows.slice(1).map((r) =>
          r
            .split("|")
            .map((c) => c.trim())
            .filter((_, i, arr) => i > 0 && i < arr.length - 1)
        );

        elements.push(
          <div
            key={`tbl-${idx}`}
            className="my-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 shadow-xs"
          >
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  {headerRow.map((h, hi) => (
                    <th key={hi} className="px-2.5 py-1.5 font-bold whitespace-nowrap">
                      {renderInline(h.replace(/\*\*/g, ""))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dataRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 align-top"
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h4
          key={idx}
          className="font-bold text-xs sm:text-sm text-blue-900 dark:text-blue-300 mt-2.5 mb-1 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
          {renderInline(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={idx}
          className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2.5 mb-1"
        >
          {renderInline(line.slice(3))}
        </h3>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h2
          key={idx}
          className="font-extrabold text-base text-slate-900 dark:text-white mt-3 mb-1.5"
        >
          {renderInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(
        <hr key={idx} className="my-2 border-slate-200 dark:border-slate-700" />
      );
      continue;
    }

    if (line.startsWith("> ")) {
      elements.push(
        <div
          key={idx}
          className="pl-3 py-1.5 my-1.5 border-l-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 rounded-r-lg text-xs text-slate-700 dark:text-slate-300"
        >
          {renderInline(line.slice(2))}
        </div>
      );
      continue;
    }

    // Sub-bullet
    if (/^\s{2,}[*•\-]\s/.test(rawLine)) {
      const clean = rawLine.replace(/^\s+[*•\-]\s*/, "");
      elements.push(
        <div
          key={idx}
          className="pl-4 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5 my-0.5"
        >
          <span className="text-slate-400 text-[10px] mt-0.5">•</span>
          <span className="flex-1">{renderInline(clean)}</span>
        </div>
      );
      continue;
    }

    // Top-level bullet
    if (/^[*•\-]\s/.test(rawLine)) {
      const clean = rawLine.replace(/^[*•\-]\s*/, "");
      elements.push(
        <div
          key={idx}
          className="pl-1 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2 my-0.5"
        >
          <span className="text-blue-500 font-bold text-xs leading-relaxed">•</span>
          <span className="flex-1 leading-relaxed">{renderInline(clean)}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = rawLine.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div
          key={idx}
          className="pl-1 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-1.5 my-0.5"
        >
          <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs w-4 flex-shrink-0">
            {numMatch[1]}.
          </span>
          <span className="flex-1 leading-relaxed">{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p
        key={idx}
        className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed my-0.5"
      >
        {renderInline(line)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};

export const AsistenWisataModal = ({
  open,
  onOpenChange,
  onSelectTripRoute,
  currentTrip,
  onApplyRundownToCurrentTrip,
}: AsistenWisataModalProps) => {
  // State Parameter Konteks
  const [targetRombongan, setTargetRombongan] =
    useState<TargetRombonganType>("smp");
  const [kotaTujuan, setKotaTujuan] = useState(
    currentTrip?.tujuan || "Yogyakarta"
  );
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [customCityInput, setCustomCityInput] = useState("");
  const [durasiHari, setDurasiHari] = useState<"1" | "2" | "3">("1");
  const [armadaBus, setArmadaBus] = useState<
    "big_bus" | "medium_bus" | "microbus"
  >("big_bus");

  // State Obrolan Interaktif
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-sync kota tujuan jika trip aktif berubah
  useEffect(() => {
    if (open && currentTrip?.tujuan) {
      setKotaTujuan(currentTrip.tujuan);
    }
  }, [open, currentTrip?.tujuan]);

  // Auto scroll saat pesan baru tiba
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Fokus input saat modal dibuka
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  // Reset sesi chat
  const handleResetChat = () => {
    setMessages([]);
    setInputText("");
    toast.info("Sesi konsultasi AI diperbarui.");
  };

  // Kirim pesan ke Google Gemini
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

      // Cek apakah ada jadwal rundown yang terdeteksi
      const parsedRundown = parseRundownFromText(reply);

      const assistantMessage: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
        parsedRundown: parsedRundown.length >= 1 ? parsedRundown : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: "e-" + Date.now(),
        role: "assistant",
        content:
          "Maaf, terjadi gangguan saat menghubungi Google Gemini AI: " +
          (err.message || "Periksa koneksi internet Anda."),
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("Gagal mendapatkan balasan AI.");
    } finally {
      setLoading(false);
    }
  };

  // Salin teks balasan ke clipboard
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Teks berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Terapkan rundown AI langsung ke Trip Aktif yang sedang dikelola
  const handleApplyToActiveTrip = async (rundown: RundownItem[]) => {
    if (!onApplyRundownToCurrentTrip || !currentTrip) return;
    setIsApplying(true);
    try {
      await onApplyRundownToCurrentTrip(rundown);
      toast.success(
        `Berhasil menyimpan ${rundown.length} jadwal rundown ke trip "${currentTrip.nama_trip}"!`
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        "Gagal menyimpan rundown: " + (err.message || "Terjadi kesalahan")
      );
    } finally {
      setIsApplying(false);
    }
  };

  // Buat trip baru dengan rundown AI
  const handleApplyAsNewTrip = (rundown: RundownItem[]) => {
    if (!onSelectTripRoute) return;

    const tripName = `${TARGET_LABELS[targetRombongan].title}: ${kotaTujuan}`;
    onSelectTripRoute({
      nama: tripName,
      tujuan: kotaTujuan,
      rundown,
    });
    toast.success("Rundown AI berhasil dimuat ke formulir Trip Baru!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl h-[94vh] sm:h-[88vh] flex flex-col p-0 gap-0 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        {/* ========================================================= */}
        {/* HEADER KOMPAK: BERSIH, RAMAH MOBILE & PROFESIONAL         */}
        {/* ========================================================= */}
        <DialogHeader className="p-3 sm:p-3.5 pr-12 sm:pr-14 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <DialogTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    Asisten Wisata AI
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Gemini AI
                  </span>
                </div>
                <DialogDescription className="text-[10px] text-slate-500 truncate">
                  Konsultan rute, rundown lapangan, resto rombongan & akses bus
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetChat}
                  className="h-7 px-2 text-[11px] rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                  title="Mulai obrolan baru"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  <span>Chat Baru</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ========================================================= */}
        {/* HORIZONTAL CONTEXT STRIP (HEMAT RUANG DI MOBILE)           */}
        {/* ========================================================= */}
        <div className="px-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
            Konteks:
          </span>

          {currentTrip && (
            <div className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Bus className="w-2.5 h-2.5 text-blue-600" />
              <span>Trip: {currentTrip.nama_trip}</span>
            </div>
          )}

          {/* Kota Tujuan Picker Chip & Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowCityPicker((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:border-blue-400 transition-all whitespace-nowrap shadow-xs"
              title="Pilih atau ubah kota destinasi"
            >
              <MapPin className="w-3 h-3 text-blue-600" />
              <span>{kotaTujuan}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {showCityPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCityPicker(false)}
                />
                <div className="absolute left-0 top-full mt-1.5 z-50 w-64 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Kota Destinasi
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCityPicker(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customCityInput.trim()) {
                        setKotaTujuan(customCityInput.trim());
                        setCustomCityInput("");
                        setShowCityPicker(false);
                        toast.info(`Kota tujuan: ${customCityInput.trim()}`);
                      }
                    }}
                    className="flex gap-1"
                  >
                    <Input
                      value={customCityInput}
                      onChange={(e) => setCustomCityInput(e.target.value)}
                      placeholder="Ketik nama kota..."
                      className="h-7 text-xs rounded-lg"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 px-2.5 text-[11px] rounded-lg bg-blue-600 text-white font-semibold"
                    >
                      Set
                    </Button>
                  </form>

                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 mb-1 font-medium">Kota Populer:</p>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                      {POPULAR_DESTINATIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setKotaTujuan(c);
                            setShowCityPicker(false);
                            toast.info(`Kota tujuan: ${c}`);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                            kotaTujuan === c
                              ? "bg-blue-600 text-white font-semibold"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Segment Selector Chips */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(Object.keys(TARGET_LABELS) as TargetRombonganType[]).map((key) => {
              const item = TARGET_LABELS[key];
              const isSelected = targetRombongan === key;
              const IconComp = TARGET_ICONS[key] || Users;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTargetRombongan(key)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <IconComp className="w-3 h-3" />
                  <span>{item.tag}</span>
                </button>
              );
            })}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Armada Bus Chips */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {[
              { id: "big_bus", label: "Big Bus" },
              { id: "medium_bus", label: "Medium" },
              { id: "microbus", label: "HiAce" },
            ].map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setArmadaBus(a.id as any)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  armadaBus === a.id
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Durasi Chips */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {[
              { id: "1", label: "1 Hari" },
              { id: "2", label: "2 Hari" },
              { id: "3", label: "3 Hari" },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDurasiHari(d.id as any)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  durasiHari === d.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* AREA PESAN CHAT: SCROLLABLE, MODERN & INTERAKTIF          */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {messages.length === 0 ? (
            /* TAMPILAN AWAL SEBELUM ADA PESAN */
            <div className="h-full flex flex-col justify-center items-center text-center py-4 px-2 space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Konsultasi Rute & Operasional Lapangan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tanyakan rute wisata, susun rundown per jam, rekomendasi resto bus besar, atau minta revisi jadwal kapan saja.
                </p>
              </div>

              {/* Quick Prompt Cards */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                {INITIAL_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTargetRombongan(item.target);
                      setKotaTujuan(item.kota);
                      handleSendMessage(item.prompt);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-xs space-y-1 group"
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* DAFTAR PESAN PERCAKAPAN */
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-xs px-3.5 py-2 max-w-[85%] shadow-xs"
                        : msg.isError
                        ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-tl-xs px-3.5 py-2.5 max-w-[95%] sm:max-w-[90%]"
                        : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700/60 rounded-tl-xs px-3.5 py-2.5 max-w-[95%] sm:max-w-[90%] shadow-xs"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownView content={msg.content} />
                    )}
                  </div>

                  {/* Footer Aksi Pesan AI */}
                  {msg.role === "assistant" && !msg.isError && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 ml-1">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin Teks</span>
                          </>
                        )}
                      </button>

                      {msg.parsedRundown && msg.parsedRundown.length >= 1 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {currentTrip && onApplyRundownToCurrentTrip && (
                            <button
                              type="button"
                              disabled={isApplying}
                              onClick={() => handleApplyToActiveTrip(msg.parsedRundown!)}
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition-all shadow-xs active:scale-95 disabled:opacity-50"
                              title={`Simpan ${msg.parsedRundown.length} kegiatan langsung ke rundown trip ${currentTrip.nama_trip}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Simpan ke Trip: "{currentTrip.nama_trip}" ({msg.parsedRundown.length} Jadwal)</span>
                            </button>
                          )}

                          {onSelectTripRoute && (
                            <button
                              type="button"
                              onClick={() => handleApplyAsNewTrip(msg.parsedRundown!)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs"
                            >
                              <Plus className="w-3 h-3 text-blue-600" />
                              <span>{currentTrip ? "Jadikan Trip Baru" : `Terapkan Rundown (${msg.parsedRundown.length} Jadwal)`}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Status Loading Pesan Sedang Digenerate */}
              {loading && (
                <div className="flex items-start gap-2">
                  <div className="p-3 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60 text-slate-500 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Menganalisis rute, rundown & logistik lapangan...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* QUICK FOLLOW-UP CHIPS (REVISI FLEKSIBEL TANPA HARDCODE)   */}
        {/* ========================================================= */}
        {messages.length > 0 && !loading && (
          <div className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
              Tanya Cepat:
            </span>
            {[
              "Ganti resto dengan yang lebih murah",
              "Kurangi waktu agar tidak kemalaman",
              "Bisa masuk Big Bus SHD?",
              "Estimasi tiket masuk & parkir",
              "Rekomendasi pusat oleh-oleh terdekat",
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 whitespace-nowrap transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* INPUT BAR BAWAH: COMPACT, NYAMAN DI MOBILE                */}
        {/* ========================================================= */}
        <div className="p-2.5 sm:p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
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
              placeholder="Tanya rute, minta revisi jam/resto, atau destinasi..."
              disabled={loading}
              className="h-9 sm:h-10 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex-1 font-medium"
            />
            <Button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
