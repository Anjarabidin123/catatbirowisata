import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Bot, User, Trash2, ArrowRight, Bus, Compass, MapPin } from "lucide-react";
import { askTourismAssistant, ChatMessage } from "@/utils/asistenWisataAI";

interface AsistenWisataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTripRoute?: (tripData: { nama: string; tujuan: string }) => void;
}

const DEFAULT_SUGGESTIONS = [
  "Rute Wisata 1 Hari Semarang untuk Bus",
  "Estimasi HTM & Rundown Jogja",
  "Akses Bus Besar ke Dieng",
  "Rekomendasi Wisata Rombongan di Batu Malang",
];

export const AsistenWisataModal = ({
  open,
  onOpenChange,
  onSelectTripRoute,
}: AsistenWisataModalProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Halo! Saya **Asisten AI Wisata Nusantara**. 🇮🇩\n\nSaya dapat membantu Anda mencari **rute wisata akurat**, **HTM objek wisata terkini**, **kantong parkir bus pariwisata**, **rumah makan rombongan**, dan **estimasi rundown acara**.\n\nAda rencana rute trip yang ingin Anda tanyakan hari ini?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 150);
    }
  }, [messages, open]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await askTourismAssistant(query);
      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        role: "assistant",
        content: response.text,
        suggestedTrip: response.suggestedTrip,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-err-" + Date.now(),
          role: "assistant",
          content: "Maaf, terjadi kendala saat memproses pertanyaan Anda: " + err.message,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRoute = (route: { nama: string; tujuan: string }) => {
    if (onSelectTripRoute) {
      onSelectTripRoute(route);
      onOpenChange(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Riwayat percakapan telah dibersihkan. Silakan tanyakan rute destinasi yang ingin Anda rencanakan!",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl h-[85vh] max-h-[700px] flex flex-col p-0 gap-0 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Asisten AI Wisata Nusantara</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Online & Akurat
                  </span>
                </DialogTitle>
                <p className="text-[11px] text-slate-500">
                  Konsultasi rute bus, HTM objek wisata & rundown biro perjalanan
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-600"
              title="Bersihkan Percakapan"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Chat Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-500/15"
                    : "bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/60 dark:border-slate-700/50"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans space-y-1">
                  {msg.content}
                </div>

                {/* Direct Action: Buat Jadwal Trip Cepat */}
                {msg.suggestedTrip && onSelectTripRoute && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700">
                    <Button
                      size="sm"
                      onClick={() => handleApplyRoute(msg.suggestedTrip!)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-8 font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Bus className="w-3.5 h-3.5" />
                      <span>Buat Jadwal Trip Rute Ini</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-400">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span>Asisten AI sedang menyusun informasi akurat...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar flex-shrink-0">
          {DEFAULT_SUGGESTIONS.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(sug)}
              disabled={loading}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300 whitespace-nowrap transition-all shadow-sm active:scale-95"
            >
              💡 {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 flex-shrink-0"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan rute wisata, HTM, parkir bus, atau rundown..."
            disabled={loading}
            className="rounded-2xl h-11 text-xs sm:text-sm pl-4 pr-3 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-600"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 shadow-md shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
