import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export const NotificationPermission = () => {
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const hasAsked = localStorage.getItem("notification-permission-asked");
    
    if (!hasAsked && "Notification" in window && Notification.permission === "default") {
      setShowDialog(true);
    }
  }, []);

  const handleAllow = async () => {
    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem("notification-permission-asked", "true");
      
      if (permission === "granted") {
        // Show test notification
        new Notification("Malika Tour", {
          body: "Notifikasi pengingat berhasil diaktifkan! Anda akan menerima notifikasi H-2, H-1, dan H-5 jam sebelum trip.",
          icon: "/malika-logo.png",
          badge: "/malika-logo.png",
        });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
    setShowDialog(false);
  };

  const handleDeny = () => {
    localStorage.setItem("notification-permission-asked", "true");
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <DialogTitle>Aktifkan Notifikasi</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            Izinkan notifikasi untuk mendapatkan pengingat jadwal trip Anda tepat waktu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={handleDeny}>
            Nanti Saja
          </Button>
          <Button onClick={handleAllow}>
            Izinkan Notifikasi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
