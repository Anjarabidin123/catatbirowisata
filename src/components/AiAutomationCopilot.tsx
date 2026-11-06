import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  Send,
  Bus,
  Users,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Bot,
  Zap,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import {
  processConversationalMessage,
  getActiveWizardState,
  resetWizard,
  DialogResponse,
  WizardType,
} from "@/utils/aiAutomationEngine";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: string;
  options?: string[];
  isComplete?: boolean;
  navigationPath?: string;
  actionType?: string;
  stepIndex?: number;
  totalSteps?: number;
}

const QUICK_COMMANDS = [
  {
    label: "📅 Buat Trip Baru",
    cmd: "buat trip baru",
    desc: "Panduan interaktif 6 langkah",
  },
  {
    label: "🚌 Tambah Bus",
    cmd: "tambah bus",
    desc: "Daftar PO & armada bus",
  },
  {
    label: "👤 Daftarkan Kru",
    cmd: "tambah kru",
    desc: "Registrasi TL / Driver",
  },
  {
    label: "💰 Catat Kas BBM",
    cmd: "catat pengeluaran bbm",
    desc: "Catat pengeluaran trip",
  },
  {
    label: "📊 Cek Status & Kuota",
    cmd: "cek status kuota dan kru aktif biro saya",
    desc: "Ringkasan real-time biro",
  },
];

export const AiAutomationCopilot: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [wizardState, setWizardState] = useState<{
    wizardType: WizardType;
    step: number;
  }>({ wizardType: "NONE", step: 0 });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "msg-init",
        sender: "bot",
        text:
          "👋 Halo! Saya **Asisten Pribadi Otomasi CatatBiro** (Zero Token Engine).\n\n" +
          "Saya bekerja secara interaktif langkah demi langkah layaknya asisten pribadi tanpa menguras kuota token Gemini. Silakan pilih menu di bawah atau ketik langsung kebutuhan operasional Anda:",
        options: [
          "📅 Buat Trip Baru",
          "🚌 Tambah Bus",
          "👤 Daftarkan Kru",
          "💰 Catat Kas BBM",
          "📊 Cek Status & Kuota",
        ],
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K & custom window event
  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("open-ai-copilot", handleOpenEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-ai-copilot", handleOpenEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Auto scroll ke bawah saat ada pesan baru
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 120);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend || inputPrompt).trim();
    if (!rawText || isProcessing) return;

    setInputPrompt("");

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: rawText,
      timestamp: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Jalankan FSM Dialog Engine lokal (Zero Token)
      const response: DialogResponse = await processConversationalMessage(rawText);

      // Perbarui status wizard saat ini
      const currentWizard = getActiveWizardState();
      setWizardState({
        wizardType: currentWizard.wizardType,
        step: currentWizard.step,
      });

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: response.botMessage,
        options: response.options,
        isComplete: response.isComplete,
        navigationPath: response.navigationPath,
        actionType: response.actionType,
        stepIndex: response.stepIndex,
        totalSteps: response.totalSteps,
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMessage]);

      if (response.isComplete) {
        toast.success(
          response.actionType === "CREATE_TRIP"
            ? "Trip baru berhasil disimpan ke database!"
            : "Aksi berhasil dieksekusi!"
        );
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "bot",
        text: `⚠️ Maaf, terjadi kendala: ${err?.message || "Tidak dapat memproses pesan"}.`,
        options: ["❌ Batal / Reset Menu"],
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = () => {
    resetWizard();
    setWizardState({ wizardType: "NONE", step: 0 });
    setMessages([
      {
        id: "msg-reset",
        sender: "bot",
        text:
          "🧹 **Percakapan telah di-reset.**\n\n" +
          "Silakan pilih menu baru di bawah atau ketik instruksi Anda:",
        options: [
          "📅 Buat Trip Baru",
          "🚌 Tambah Bus",
          "👤 Daftarkan Kru",
          "💰 Catat Kas BBM",
          "📊 Cek Status & Kuota",
        ],
        timestamp: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const isWizardActive = wizardState.wizardType !== "NONE";

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 px-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-xl shadow-blue-500/25 flex items-center gap-2 text-xs font-black tracking-wide border border-white/20 transition-transform active:scale-95 group"
          title="Buka Asisten Pribadi Otomasi (Ctrl+K)"
        >
          <div className="relative">
            <Terminal className="w-4 h-4 transition-transform group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span className="hidden sm:inline">AI Copilot</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-mono hidden md:inline">
            Ctrl+K
          </span>
        </Button>
      </div>

      {/* Dialog Terminal Copilot */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] h-[85vh] sm:h-[750px] p-0 gap-0 rounded-2xl sm:rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col overflow-hidden shadow-2xl z-50">
          {/* Header Terminal */}
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Asisten Pribadi Otomasi</span>
                  {isWizardActive ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 gap-1 py-0 px-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Langkah {wizardState.step}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 gap-1 py-0 px-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ZERO TOKEN • ONLINE
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {isWizardActive
                    ? "Sedang dalam sesi panduan interaktif bertahap. Ketik jawaban atau klik pilihan."
                    : "Form-Filling Terpandu: Tambah trip, bus, kru & kas langkah demi langkah tanpa kuota."}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearHistory}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                title="Reset Percakapan & Batalkan Wizard"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Quick Menu Chips */}
          <div className="px-3 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Menu Cepat:
            </span>
            {QUICK_COMMANDS.map((qc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(qc.cmd)}
                disabled={isProcessing}
                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left shadow-2xs"
              >
                {qc.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {isUser ? "Anda" : "Asisten CatatBiro"}
                    </span>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-blue-600 text-white rounded-br-xs font-medium"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/70 dark:border-slate-800 font-normal"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Tombol Opsi Interaktif (Clickable Pills) */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-1.5">
                        {msg.options.map((opt, idx) => {
                          const isCancel =
                            opt.includes("Batal") || opt.toLowerCase().includes("cancel");
                          const isSkip =
                            opt.includes("Lewati") ||
                            opt.toLowerCase().includes("skip") ||
                            opt.toLowerCase().includes("ga");
                          const isConfirm =
                            opt.includes("Ya,") ||
                            opt.includes("Simpan") ||
                            opt.includes("Daftarkan") ||
                            opt.includes("Selesai");

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isSkip) {
                                  handleSendMessage("skip");
                                } else if (isCancel) {
                                  handleSendMessage("batal");
                                } else if (opt.includes("Selesai")) {
                                  handleSendMessage("selesai");
                                } else {
                                  handleSendMessage(opt);
                                }
                              }}
                              disabled={isProcessing}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all text-left flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer ${
                                isConfirm
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                  : isCancel
                                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100"
                                  : isSkip
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50"
                              }`}
                            >
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Tombol Navigasi jika aksi selesai */}
                    {msg.navigationPath && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Data berhasil tersimpan
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsOpen(false);
                            if (msg.navigationPath) navigate(msg.navigationPath);
                          }}
                          className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-sm"
                        >
                          <span>Buka Hasil</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-400">Asisten CatatBiro</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses instruksi ke database biro...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Terminal Input Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold pointer-events-none">
                  &gt;
                </div>
                <Input
                  ref={inputRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder={
                    isWizardActive
                      ? "Ketik jawaban atau pilih opsi di atas (ketik 'skip' / 'ga' jika ingin dilewati)..."
                      : "Ketik perintah (cth: buat trip baru, tambah bus, daftarkan kru, catat kas)..."
                  }
                  disabled={isProcessing}
                  className="pl-7 pr-3 h-11 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 shadow-2xs font-sans placeholder:text-slate-400 focus-visible:ring-blue-500"
                />
              </div>

              <Button
                type="submit"
                disabled={!inputPrompt.trim() || isProcessing}
                className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm shadow-blue-500/20 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Kirim</span>
              </Button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                💡 Ketik <strong>&quot;skip&quot;</strong> / <strong>&quot;ga&quot;</strong> untuk melewati field opsional, atau <strong>&quot;batal&quot;</strong> untuk reset.
              </span>
              <span className="hidden sm:inline">⚡ Zero Token Engine (Hemat Kuota)</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};