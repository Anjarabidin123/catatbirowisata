import { useState } from "react";
import { MessageCircle, Compass } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";

export const AnimatedHeader = () => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Pencatatan Agen Biro
          </h1>
          <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">
            Sistem Operasional Trip
          </p>
        </div>
        <button
          onClick={() => setShowFeedback(true)}
          className="ml-1 p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
          title="Bantuan / Feedback"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
    </>
  );
};
