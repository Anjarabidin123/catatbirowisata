import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackDialog = ({ open, onOpenChange }: FeedbackDialogProps) => {
  const [feedback, setFeedback] = useState("");

  const handleSendFeedback = () => {
    if (!feedback.trim()) {
      toast.error("Mohon isi kritik dan saran Anda");
      return;
    }

    const phoneNumber = "62895630183347"; // Format internasional
    const message = encodeURIComponent(
      `*Kritik & Saran Malika Tour*\n\n${feedback}\n\n_Dikirim dari Aplikasi Malika Tour_`
    );
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    window.open(whatsappUrl, "_blank");
    toast.success("Mengarahkan ke WhatsApp...");
    setFeedback("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Kirim ke Developer
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="feedback">Kritik & Saran</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tuliskan kritik, saran, atau laporkan bug di sini..."
              rows={6}
              className="mt-1 resize-none"
            />
          </div>
          <Button
            onClick={handleSendFeedback}
            className="w-full gradient-primary text-white"
          >
            Kirim via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
