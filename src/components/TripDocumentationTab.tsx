import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Media {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

interface TripDocumentationTabProps {
  tripId: string;
}

export const TripDocumentationTab = ({ tripId }: TripDocumentationTabProps) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMedia();

    const channel = supabase
      .channel(`media-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media", filter: `trip_id=eq.${tripId}` },
        () => loadMedia()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadMedia = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMedia(data || []);
    } catch (error: any) {
      console.error("Error loading media:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: "image" | "video") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload ke storage
        const { error: uploadError } = await supabase.storage
          .from("trip-media")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Simpan metadata ke database
        const { error: dbError } = await supabase.from("media").insert({
          trip_id: tripId,
          user_id: user.id,
          file_path: fileName,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
        });

        if (dbError) throw dbError;
      }

      toast.success("File berhasil diupload");
    } catch (error: any) {
      console.error("Error uploading:", error);
      toast.error("Gagal upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, filePath: string) => {
    if (!confirm("Hapus file ini?")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("trip-media")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("media")
        .delete()
        .eq("id", mediaId);

      if (dbError) throw dbError;

      toast.success("File berhasil dihapus");
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Gagal menghapus file");
    }
  };

  const getMediaUrl = (filePath: string) => {
    const { data } = supabase.storage.from("trip-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const photos = media.filter((m) => m.file_type === "image");
  const videos = media.filter((m) => m.file_type === "video");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Dokumentasi</h2>

      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="photos">Foto ({photos.length})</TabsTrigger>
          <TabsTrigger value="videos">Video ({videos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Upload foto dengan kualitas tinggi</p>
            <label htmlFor="photo-upload">
              <input
                id="photo-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "image")}
                disabled={uploading}
              />
              <Button
                className="gradient-primary text-white"
                disabled={uploading}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Foto"}
                </span>
              </Button>
            </label>
          </div>

          {photos.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Belum ada foto</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((item) => (
                <div key={item.id} className="ios-card overflow-hidden group relative">
                  <img
                    src={getMediaUrl(item.file_path)}
                    alt={item.file_name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a
                      href={getMediaUrl(item.file_path)}
                      download={item.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="icon" variant="secondary" className="bg-white">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteMedia(item.id, item.file_path)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Upload video tanpa batas ukuran</p>
            <label htmlFor="video-upload">
              <input
                id="video-upload"
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "video")}
                disabled={uploading}
              />
              <Button
                className="gradient-primary text-white"
                disabled={uploading}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Video"}
                </span>
              </Button>
            </label>
          </div>

          {videos.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Belum ada video</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {videos.map((item) => (
                <div key={item.id} className="ios-card overflow-hidden group relative">
                  <video
                    src={getMediaUrl(item.file_path)}
                    className="w-full object-cover"
                    controls
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteMedia(item.id, item.file_path)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
