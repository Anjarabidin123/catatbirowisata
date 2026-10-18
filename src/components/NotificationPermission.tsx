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
        new Notification("Pencatatan Agen Biro", {
          body: "Notifikasi berhasil diaktifkan! Anda akan menerima pengingat jadwal trip tepat waktu.",
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
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <DialogTitle>Aktifkan Notifikasi Operasional</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Izinkan notifikasi agar sistem dapat mengirimkan pengingat jadwal trip dan jatuh tempo secara tepat waktu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={handleDeny} className="rounded-xl">
            Nanti Saja
          </Button>
          <Button onClick={handleAllow} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            Izinkan Notifikasi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
