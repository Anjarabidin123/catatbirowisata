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
  Sparkles,
  Send,
  Bus,
  Users,
  Calendar,
  Wallet,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Minimize2,
  X,
  Bot,
  Zap,
} from "lucide-react";
import {
  parseCommandWithAI,
  executeAiAction,
  ParsedAiAction,
  ExecutionResult,
} from "@/utils/aiAutomationEngine";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: string;
  action?: ParsedAiAction;
  result?: ExecutionResult;
  isExecuting?: boolean;
}

const QUICK_COMMANDS = [
  {
    label: "🚌 Tambah Bus Baru",
    cmd: "tambah bus PO Subur Jaya SHD plat H 1234 AB kapasitas 50 seat driver Pak Budi no hp 0812345678",
  },
  {
    label: "👤 Daftarkan Kru",
    cmd: "tambah kru Mas Joko role Tour Leader nomor 0852345678",
  },
  {
    label: "📅 Buat Trip Cepat",
    cmd: "buat trip Study Tour SMPN 1 ke Bali tanggal 2026-12-15",
  },
  {
    label: "💰 Catat Kas BBM",
    cmd: "catat pengeluaran isi bensin solar bus 650rb",
  },
  {
    label: "📊 Cek Status & Kuota",
    cmd: "cek status kuota dan kru aktif biro saya",
  },
];

export const AiAutomationCopilot: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "msg-init",
        sender: "bot",
        text: "👋 Halo! Saya **AI Automation CLI** Biro Wisata Anda.\n\nKetik instruksi operasional dalam bahasa santai atau pilih contoh tombol di atas. Saya akan mengekstrak detailnya dan otomatis menyimpannya ke database!",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listener event global & keyboard shortcut Ctrl+K / Cmd+K
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

  // Auto scroll saat ada pesan baru
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 150);
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
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // 1. Analisa Perintah via AI Engine
      const parsedAction = await parseCommandWithAI(rawText);

      // 2. Eksekusi Perintah Otomatis
      const execResult = await executeAiAction(parsedAction);

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: execResult.message,
        action: parsedAction,
        result: execResult,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);

      if (execResult.success) {
        toast.success(parsedAction.summary);
      } else {
        toast.error("Gagal mengeksekusi perintah");
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "bot",
        text: `⚠️ Maaf, terjadi kesalahan: ${err?.message || "Tidak dapat memproses instruksi"}`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "msg-reset",
        sender: "bot",
        text: "🧹 Riwayat terminal telah dibersihkan. Siap menerima instruksi automasi baru!",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button (Bisa diakses dari seluruh layar) */}
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 px-4 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-xl shadow-blue-500/25 flex items-center gap-2 text-xs font-black tracking-wide border border-white/20 transition-transform active:scale-95 group"
          title="Buka Terminal AI Automasi (Ctrl+K)"
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
                  <span>AI Automation Copilot</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 gap-1 py-0 px-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ONLINE
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Smart Command Line: Ketik instruksi natural untuk menambah data & automasi biro
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearHistory}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                title="Bersihkan Percakapan"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Quick Command Chips */}
          <div className="px-3 sm:px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Cepat:
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
                      {isUser ? "Anda" : "CatatBiro Copilot"}
                    </span>
                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-blue-600 text-white rounded-br-xs font-medium"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/70 dark:border-slate-800 font-normal"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Result Card jika ada eksekusi */}
                    {msg.result && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            {msg.result.success ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                            )}
                            Aksi: {msg.result.actionType}
                          </span>
                          {msg.result.navigationPath && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsOpen(false);
                                if (msg.result?.navigationPath) {
                                  navigate(msg.result.navigationPath);
                                }
                              }}
                              className="h-6 px-2 rounded-md text-[10px] font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-950 hover:bg-blue-50 gap-1"
                            >
                              <span>Lihat Hasil</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Button>
                          )}
                        </div>

                        {msg.action?.parameters && Object.keys(msg.action.parameters).length > 0 && (
                          <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-950/70 border border-slate-200/50 dark:border-slate-800/80 font-mono text-[11px] space-y-0.5">
                            {Object.entries(msg.action.parameters).map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                <span className="text-slate-400">{key}:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                                  {String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-400">CatatBiro Copilot</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Menganalisis instruksi & mengeksekusi ke database...</span>
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
                  placeholder="Ketik perintah (cth: tambah bus Subur Jaya plat H 1234 AB driver Pak Budi)..."
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
              <span>💡 Bahasa santai didukung otomatis oleh Gemini AI & NLP engine.</span>
              <span className="hidden sm:inline">Tekan Enter untuk mengeksekusi</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
