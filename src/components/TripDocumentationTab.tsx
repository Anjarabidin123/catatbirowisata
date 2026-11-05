import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Copy,
  Check,
  Share2,
  FolderPlus,
  Trash2,
  Edit3,
  Info,
  Link as LinkIcon,
  HardDrive,
  Download,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUser } from "@/utils/authHelper";
import { logCrewActivity } from "@/utils/rbacAuditLogger";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

export interface GDriveFolderItem {
  id: string;
  label: string;
  url: string;
  keterangan?: string;
  createdAt: string;
}

export interface GDriveDocData {
  primaryLink: string;
  folderName: string;
  catatan?: string;
  additionalLinks: GDriveFolderItem[];
  updatedAt: string;
}

interface Media {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

interface TripDocumentationTabProps {
  tripId: string;
  tripName?: string;
}

// Logo Asli Google Drive dengan SVG 3-Warna Presisi
const GoogleDriveLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 87.3 78" className={className} fill="none">
    <path
      d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
      fill="#0066da"
    />
    <path
      d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"
      fill="#00ac47"
    />
    <path
      d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
      fill="#ea4335"
    />
    <path
      d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
      fill="#00832d"
    />
    <path
      d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
      fill="#2684fc"
    />
    <path
      d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
      fill="#ffba00"
    />
  </svg>
);

export const TripDocumentationTab: React.FC<TripDocumentationTabProps> = ({
  tripId,
  tripName = "Perjalanan Wisata",
}) => {
  const { isPemilik } = useRole();
  const noteTitle = `[GDRIVE_DOKUMENTASI] trip_${tripId}`;
  const localKey = `trip_gdrive_doc_${tripId}`;

  const [docData, setDocData] = useState<GDriveDocData>(() => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      primaryLink: "",
      folderName: "Dokumentasi Foto & Video Trip",
      catatan: "",
      additionalLinks: [],
      updatedAt: new Date().toISOString(),
    };
  });

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPrimaryModal, setShowPrimaryModal] = useState(false);
  const [showAddExtraModal, setShowAddExtraModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLegacyMedia, setShowLegacyMedia] = useState(false);
  const [legacyMedia, setLegacyMedia] = useState<Media[]>([]);

  // Form State
  const [primaryForm, setPrimaryForm] = useState({
    link: "",
    folderName: "Dokumentasi Foto & Video Trip",
    catatan: "",
  });

  const [extraForm, setExtraForm] = useState({
    label: "",
    url: "",
    keterangan: "",
  });

  // Muat data dari Supabase notes & local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDocData(parsed);
        setPrimaryForm({
          link: parsed.primaryLink || "",
          folderName: parsed.folderName || "Dokumentasi Foto & Video Trip",
          catatan: parsed.catatan || "",
        });
      }
    } catch {}

    const loadRemote = async () => {
      try {
        const user = await getActiveUser();
        if (!user || !tripId) return;

        const { data } = await supabase
          .from("notes")
          .select("konten")
          .eq("trip_id", tripId)
          .eq("judul", noteTitle)
          .maybeSingle();

        if (data && data.konten) {
          const parsed = JSON.parse(data.konten);
          setDocData(parsed);
          setPrimaryForm({
            link: parsed.primaryLink || "",
            folderName: parsed.folderName || "Dokumentasi Foto & Video Trip",
            catatan: parsed.catatan || "",
          });
          localStorage.setItem(localKey, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn("Gagal memuat dokumentasi GDrive:", e);
      }
    };

    loadRemote();
    loadLegacyMedia();
  }, [tripId, noteTitle, localKey]);

  // Cek arsip media lama di tabel media (jika pernah ada upload lokal)
  const loadLegacyMedia = async () => {
    try {
      const user = await getActiveUser();
      if (!user || !tripId) return;

      const { data } = await supabase
        .from("media")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setLegacyMedia(data);
      }
    } catch {}
  };

  const sanitizeUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (!/^https?:\/\//i.test(trimmed)) {
      return "https://" + trimmed;
    }
    return trimmed;
  };

  const persistDocData = async (newData: GDriveDocData) => {
    setDocData(newData);
    try {
      localStorage.setItem(localKey, JSON.stringify(newData));
    } catch {}

    try {
      const user = await getActiveUser();
      if (!user || !tripId) return;

      const { data: existing } = await supabase
        .from("notes")
        .select("id")
        .eq("trip_id", tripId)
        .eq("judul", noteTitle)
        .maybeSingle();

      const jsonStr = JSON.stringify(newData);

      if (existing) {
        await supabase
          .from("notes")
          .update({ konten: jsonStr })
          .eq("id", existing.id);
      } else {
        await supabase.from("notes").insert({
          trip_id: tripId,
          user_id: user.id,
          judul: noteTitle,
          konten: jsonStr,
        });
      }
    } catch (e) {
      console.warn("Gagal menyimpan dokumentasi GDrive ke database:", e);
    }
  };

  const handleSavePrimaryLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sanitizeUrl(primaryForm.link);
    if (!cleanUrl) {
      toast.error("Mohon masukkan tautan URL Google Drive");
      return;
    }

    setLoading(true);
    try {
      const updated: GDriveDocData = {
        ...docData,
        primaryLink: cleanUrl,
        folderName: primaryForm.folderName.trim() || "Dokumentasi Foto & Video Trip",
        catatan: primaryForm.catatan.trim(),
        updatedAt: new Date().toISOString(),
      };

      await persistDocData(updated);
      logCrewActivity({
        kategori: "catatan_htm",
        aksi: "Menyimpan Link Google Drive Dokumentasi",
        detail: `Mengatur tautan Google Drive: ${updated.folderName} (${cleanUrl})`,
        tripName,
      });

      toast.success("Link Google Drive berhasil disimpan!");
      setShowPrimaryModal(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan link: " + (err.message || "Error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrimaryLink = async () => {
    if (!confirm("Hapus tautan Google Drive utama ini?")) return;

    const updated: GDriveDocData = {
      ...docData,
      primaryLink: "",
      updatedAt: new Date().toISOString(),
    };

    await persistDocData(updated);
    toast.info("Tautan Google Drive utama telah dihapus");
  };

  const handleAddExtraLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sanitizeUrl(extraForm.url);
    if (!extraForm.label.trim()) {
      toast.error("Nama / label folder wajib diisi");
      return;
    }
    if (!cleanUrl) {
      toast.error("URL tautan wajib diisi");
      return;
    }

    const newItem: GDriveFolderItem = {
      id: "extra_" + Date.now(),
      label: extraForm.label.trim(),
      url: cleanUrl,
      keterangan: extraForm.keterangan.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated: GDriveDocData = {
      ...docData,
      additionalLinks: [...(docData.additionalLinks || []), newItem],
      updatedAt: new Date().toISOString(),
    };

    await persistDocData(updated);
    setExtraForm({ label: "", url: "", keterangan: "" });
    setShowAddExtraModal(false);
    toast.success("Tautan folder tambahan berhasil ditambahkan!");
  };

  const handleDeleteExtraLink = async (id: string) => {
    const updated: GDriveDocData = {
      ...docData,
      additionalLinks: (docData.additionalLinks || []).filter((it) => it.id !== id),
      updatedAt: new Date().toISOString(),
    };
    await persistDocData(updated);
    toast.info("Tautan folder tambahan dihapus");
  };

  const handleCopyLink = (url: string, id: string = "primary") => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    toast.success("Link Google Drive berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(null), 2500);
  };

  const handleShareToWhatsApp = (url: string, title: string) => {
    const message = `Halo Bapak/Ibu rombongan wisata *${tripName}*, berikut link Google Drive untuk ${title}:\n\n🔗 ${url}\n\nSilakan diakses dan diunduh untuk kenang-kenangan dokumentasi kegiatan. Terima kasih telah berwisata bersama kami! 🙏✨`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const hasPrimaryLink = !!docData.primaryLink;

  return (
    <div className="space-y-4">
      {/* Header Dokumentasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GoogleDriveLogo className="w-5 h-5 shrink-0" />
              <span>Dokumentasi Trip (Google Drive)</span>
            </h2>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                hasPrimaryLink
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200"
              }`}
            >
              {hasPrimaryLink ? "✓ Link Aktif" : "Belum Ada Link"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Akses dan bagikan folder foto & video resolusi tinggi via Google Drive tanpa batasan kuota.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowGuide(!showGuide)}
            className="h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 gap-1 text-slate-600 dark:text-slate-300"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>{showGuide ? "Tutup Petunjuk" : "Petunjuk Akses"}</span>
          </Button>
          {hasPrimaryLink && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPrimaryForm({
                  link: docData.primaryLink,
                  folderName: docData.folderName || "Dokumentasi Foto & Video Trip",
                  catatan: docData.catatan || "",
                });
                setShowPrimaryModal(true);
              }}
              className="h-8 text-xs rounded-xl border-slate-200 dark:border-slate-700 gap-1"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Edit Link</span>
            </Button>
          )}
        </div>
      </div>

      {/* Petunjuk Akses / Cara Berbagi Google Drive */}
      {showGuide && (
        <Card className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Cara Menyiapkan Folder Dokumentasi Google Drive:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed pl-1">
            <li>
              Buka <strong>Google Drive</strong> (drive.google.com) lalu buat folder baru dengan nama trip (contoh: <em>"Dokumentasi {tripName}"</em>).
            </li>
            <li>Unggah seluruh foto dari kamera DSLR / HP serta video highlight ke dalam folder tersebut.</li>
            <li>
              Klik kanan folder &gt; pilih <strong>Bagikan (Share)</strong> &gt; ubah Akses Umum menjadi <strong>"Siapa saja yang memiliki link dapat melihat (Viewer)"</strong>.
            </li>
            <li>
              Salin tautan (Copy Link) dan tempelkan di form aplikasi ini. Rombongan dan kru dapat langsung mengunduh dari HP mereka.
            </li>
          </ol>
        </Card>
      )}

      {/* Kartu Hero Google Drive Utama */}
      {!hasPrimaryLink ? (
        <Card className="p-6 sm:p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center mx-auto border border-blue-200/60 dark:border-blue-800 shadow-xs">
            <GoogleDriveLogo className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Folder Google Drive Belum Diatur
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hubungkan tautan Google Drive dokumentasi trip ini agar wisatawan dan kru dapat membuka, melihat, dan mengunduh foto & video asli tanpa batas kuota.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              onClick={() => {
                setPrimaryForm({
                  link: "",
                  folderName: "Dokumentasi Foto & Video Trip",
                  catatan: "",
                });
                setShowPrimaryModal(true);
              }}
              className="h-9 px-4 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
            >
              <GoogleDriveLogo className="w-4 h-4" />
              <span>+ Pasang Link Google Drive</span>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          {/* Baris Informasi Folder */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center border border-blue-200/60 dark:border-blue-800 shrink-0 shadow-xs">
                <GoogleDriveLogo className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {docData.folderName || "Folder Dokumentasi Foto & Video"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {docData.catatan || "Folder Google Drive resmi foto kamera DSLR, HP, dan video rombongan."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDeletePrimaryLink}
                className="h-8 w-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Hapus Link GDrive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Kotak Tautan URL Lengkap */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <LinkIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <a
                href={docData.primaryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                {docData.primaryLink}
              </a>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleCopyLink(docData.primaryLink, "primary")}
              className="h-7 px-2 text-[11px] font-semibold rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 gap-1 shrink-0"
            >
              {copied === "primary" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </>
              )}
            </Button>
          </div>

          {/* Tombol Aksi Cepat (Buka GDrive, Bagikan WA, Salin) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <Button
              type="button"
              asChild
              className="h-9 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs"
            >
              <a href={docData.primaryLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Google Drive</span>
              </a>
            </Button>

            <Button
              type="button"
              onClick={() =>
                handleShareToWhatsApp(
                  docData.primaryLink,
                  docData.folderName || "dokumentasi foto & video"
                )
              }
              className="h-9 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Bagikan via WhatsApp</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleCopyLink(docData.primaryLink, "primary")}
              className="h-9 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 gap-1.5"
            >
              {copied === "primary" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Link Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Tautan</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Bagian Folder Tambahan (Misal: Video Drone / Piagam / Bus 2) */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Tautan Folder Tambahan ({docData.additionalLinks?.length || 0})
            </h4>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddExtraModal(true)}
            className="h-7 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-medium gap-1"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Tambah Link Lain</span>
          </Button>
        </div>

        {(!docData.additionalLinks || docData.additionalLinks.length === 0) ? (
          <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/40">
            Belum ada tautan tambahan. Anda dapat menambahkan folder terpisah (contoh: <em>Video Drone / Reels</em>, <em>Sertifikat Rombongan</em>, dll).
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {docData.additionalLinks.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-2 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <GoogleDriveLogo className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.label}
                    </span>
                  </div>
                  {item.keterangan && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {item.keterangan}
                    </p>
                  )}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-blue-600 hover:underline truncate block mt-1"
                  >
                    {item.url}
                  </a>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyLink(item.url, item.id)}
                    className="h-7 w-7 rounded-lg"
                    title="Salin Tautan"
                  >
                    {copied === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-blue-600"
                    title="Buka Folder"
                  >
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteExtraLink(item.id)}
                    className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arsip Foto & Video Supabase Lama (Hanya jika pernah ada file diupload di versi lawas) */}
      {legacyMedia.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowLegacyMedia(!showLegacyMedia)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Arsip Upload Lokal Sebelumnya ({legacyMedia.length} file)</span>
            </span>
            {showLegacyMedia ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showLegacyMedia && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {legacyMedia.map((m) => {
                const { data } = supabase.storage.from("trip-media").getPublicUrl(m.file_path);
                const fileUrl = data.publicUrl;
                return (
                  <div key={m.id} className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900">
                    {m.file_type === "image" ? (
                      <img src={fileUrl} alt={m.file_name} className="w-full h-24 object-cover" />
                    ) : (
                      <video src={fileUrl} className="w-full h-24 object-cover" controls />
                    )}
                    <div className="p-1.5 text-[10px] text-muted-foreground truncate flex items-center justify-between">
                      <span className="truncate">{m.file_name}</span>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 shrink-0">
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Dialog Atur / Edit Link Google Drive Utama */}
      <Dialog open={showPrimaryModal} onOpenChange={setShowPrimaryModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GoogleDriveLogo className="w-5 h-5 shrink-0" />
              <span>Tautan Folder Google Drive Trip</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan tautan folder Google Drive yang berisi dokumentasi foto dan video untuk trip{" "}
              <strong>"{tripName}"</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePrimaryLink} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tautan URL Google Drive *</Label>
              <Input
                required
                type="text"
                placeholder="https://drive.google.com/drive/folders/1A2b3C... atau link pendek"
                value={primaryForm.link}
                onChange={(e) => setPrimaryForm({ ...primaryForm, link: e.target.value })}
                className="h-9 text-xs rounded-xl font-mono"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Pastikan folder di Google Drive disetel ke <em>"Siapa saja yang memiliki link dapat melihat"</em>.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama / Judul Folder</Label>
              <Input
                placeholder="Contoh: Dokumentasi Foto & Video Full Trip"
                value={primaryForm.folderName}
                onChange={(e) => setPrimaryForm({ ...primaryForm, folderName: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Catatan / Panduan untuk Peserta (Opsional)</Label>
              <Input
                placeholder="Contoh: Termasuk foto DSLR per objek & video drone"
                value={primaryForm.catatan}
                onChange={(e) => setPrimaryForm({ ...primaryForm, catatan: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPrimaryModal(false)}
                className="h-8 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="h-8 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Menyimpan..." : "Simpan Link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Tambah Tautan Folder Tambahan */}
      <Dialog open={showAddExtraModal} onOpenChange={setShowAddExtraModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-600" />
              <span>Tambah Tautan Folder Tambahan</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan folder terpisah seperti Video Drone / Highlight Reels atau sertifikat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddExtraLink} className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Folder / Kategori *</Label>
              <Input
                required
                placeholder="Contoh: Video Drone & Reels / Foto Bus 1"
                value={extraForm.label}
                onChange={(e) => setExtraForm({ ...extraForm, label: e.target.value })}
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tautan URL Google Drive *</Label>
              <Input
                required
                type="text"
                placeholder="https://drive.google.com/..."
                value={extraForm.url}
                onChange={(e) => setExtraForm({ ...extraForm, url: e.target.value })}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Keterangan Singkat (Opsional)</Label>
              <Input
                placeholder="Contoh: Resolusi 4K untuk media sosial"
                value={extraForm.keterangan}
                onChange={(e) => setExtraForm({ ...extraForm, keterangan: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddExtraModal(false)}
                className="h-8 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Tambahkan Tautan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
