import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";
import BusAnimation from "@/components/BusAnimation";

export const AnimatedHeader = () => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-10">
            <BusAnimation />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Malika Tour
          </h1>
        </div>
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-primary group"
          title="Kirim kritik & saran"
        >
          <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      </div>
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
    </>
  );
};
