import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Tag,
  Clock,
  Sparkles,
  Bookmark,
  Share2,
  FileText,
  Users,
  Bus,
  ShieldCheck,
  Globe,
  Wallet,
  X,
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LEARN_GUIDES,
  LEARN_CATEGORIES,
  LearnGuide,
} from "@/data/learnGuidesData";
import { toast } from "sonner";

export const LearnKnowledgeBase: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua Kategori");
  const [activeGuide, setActiveGuide] = useState<LearnGuide | null>(null);

  // Filtered guides based on search query & category
  const filteredGuides = useMemo(() => {
    return LEARN_GUIDES.filter((guide) => {
      const matchCategory =
        selectedCategory === "Semua Kategori" || guide.category === selectedCategory;

      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchTitle = guide.title.toLowerCase().includes(q);
      const matchSummary = guide.summary.toLowerCase().includes(q);
      const matchTags = guide.tags.some((t) => t.toLowerCase().includes(q));
      const matchHighlights = guide.highlights.some((h) => h.toLowerCase().includes(q));

      return matchTitle || matchSummary || matchTags || matchHighlights;
    });
  }, [searchQuery, selectedCategory]);

  const handleShare = (guide: LearnGuide) => {
    if (navigator.share) {
      navigator
        .share({
          title: guide.title,
          text: guide.summary,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${guide.title}\n\n${guide.summary}`);
      toast.success("Ringkasan SOP berhasil disalin ke clipboard!");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Operasional & Jadwal":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "Manifest & Bus":
        return <Bus className="w-4 h-4 text-indigo-500" />;
      case "Keuangan & Kas":
        return <Wallet className="w-4 h-4 text-emerald-500" />;
      case "Infrastruktur & Cloud":
        return <Globe className="w-4 h-4 text-cyan-500" />;
      case "Kru & Keamanan":
        return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      default:
        return <BookOpen className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 lg:pb-12 safe-top lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight truncate">
                    Pusat SOP & Knowledge Base
                  </h1>
                  <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold"
                  >
                    Biro Wisata ID
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Standar Prosedur Operasional Praktis untuk Pemilik & Kru Lapangan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/boost")}
                className="hidden sm:flex text-xs font-bold border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Upgrade Paket
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Banner Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold backdrop-blur-md">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Dokumentasi Resmi Operasional Biro</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Standar Operasional Lapangan & Manajemen Biro Modern
              </h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                Pelajari cara mengonversi rundown Word otomatis, menata denah kursi bus 50-seat,
                mengontrol uang kas saku TL (petty cash), hingga memasang nama domain biro Anda sendiri.
              </p>
            </div>

            <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10 pointer-events-none hidden md:block">
              <BookOpen className="w-96 h-96 text-white" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari SOP (misal: rundown, kas saku, kursi bus)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl h-11 text-sm shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 self-center">
              Menampilkan {filteredGuides.length} panduan
            </span>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {LEARN_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat !== "Semua Kategori" && getCategoryIcon(cat)}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Guides Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {filteredGuides.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Tidak ada panduan yang cocok
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Coba gunakan kata kunci lain seperti "rundown", "manifest", atau pilih kategori "Semua Kategori".
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Semua Kategori");
                }}
              >
                Reset Pencarian
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
                        {getCategoryIcon(guide.category)}
                        {guide.category}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{guide.readTime}</span>
                      </div>
                    </div>

                    {/* Title & Summary */}
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-snug">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {guide.summary}
                      </p>
                    </div>

                    {/* Highlights bullet */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {guide.highlights.map((h, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{h}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {guide.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bottom */}
                  <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      onClick={() => setActiveGuide(guide)}
                      className="flex-1 bg-slate-900 hover:bg-blue-600 text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-xs font-bold rounded-xl h-9"
                    >
                      <span>Baca SOP Lengkap</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleShare(guide)}
                      className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      title="Bagikan SOP"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Practical Field Tips Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="rounded-3xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-800/60 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md flex-shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Tips Praktis Lapangan (Best Practices Tour Leader)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ringkasan respon cepat untuk mengatasi kendala tak terduga selama perjalanan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Macet Parah di Jalan Tol</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Gunakan menu rundown PWA untuk menggeser waktu makan siang. Telepon pihak restoran rekanan minimal 1 jam sebelum estimasi tiba untuk memanaskan masakan agar peserta tidak menunggu lapar.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-400">
                  <Users className="w-4 h-4" />
                  <span>Peserta Tertinggal di Rest Area</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Lakukan absensi cepat melalui fitur Denah Kursi sebelum pintu bus ditutup. Simpan nomor telepon pendamping rombongan atau ketua rombongan di catatan kontak trip.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-400">
                  <Wallet className="w-4 h-4" />
                  <span>Struk Parkir & BBM Hilang</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Biasakan langsung memfoto nota BBM dan karcis retribusi jalan segera setelah transaksi ke fitur Kas Saku PWA. Foto otomatis tersimpan aman di cloud server.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Reader for Full Guide */}
        <Dialog open={!!activeGuide} onOpenChange={(open) => !open && setActiveGuide(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
            {activeGuide && (
              <div className="space-y-6">
                <DialogHeader className="space-y-2 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-blue-600 text-white font-bold text-xs">
                      {activeGuide.category}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-500">
                      ⏱ {activeGuide.readTime}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      • Update: {activeGuide.lastUpdated}
                    </span>
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white leading-tight">
                    {activeGuide.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                    {activeGuide.summary}
                  </DialogDescription>
                </DialogHeader>

                {/* Highlights Summary Box */}
                <div className="bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <span className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                    Poin Utama SOP
                  </span>
                  <div className="space-y-1.5">
                    {activeGuide.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-blue-950 dark:text-blue-200">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-6 pt-2">
                  {activeGuide.sections.map((sec, idx) => (
                    <div key={idx} className="space-y-2.5">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white border-b pb-1 border-slate-100 dark:border-slate-800">
                        {sec.heading}
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {sec.content}
                      </p>

                      {sec.checklist && sec.checklist.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl space-y-2 border border-slate-200/80 dark:border-slate-700/60">
                          {sec.checklist.map((item, cIdx) => (
                            <div key={cIdx} className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200">
                              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                                {cIdx + 1}
                              </span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {sec.callout && (
                        <div
                          className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                            sec.callout.type === "warning"
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                              : sec.callout.type === "tip"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                              : "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200"
                          }`}
                        >
                          {sec.callout.type === "warning" && (
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          )}
                          {sec.callout.type === "tip" && (
                            <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          )}
                          {sec.callout.type === "info" && (
                            <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          )}
                          <span>{sec.callout.text}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Direct Action Button */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Button
                    onClick={() => {
                      const dest = activeGuide.actionUrl;
                      setActiveGuide(null);
                      navigate(dest);
                    }}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-10 px-5 gap-2"
                  >
                    <span>{activeGuide.actionText}</span>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveGuide(null)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Tutup Panduan
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
};

export default LearnKnowledgeBase;
