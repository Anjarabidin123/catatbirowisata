import { useState } from "react";
import { MessageCircle, Bus } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";

export const AnimatedHeader = () => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-emerald-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
          <Bus className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Biro Wisata
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Operasional
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Pesona Wisata Nusantara</span>
          </div>
        </div>
        <button
          onClick={() => setShowFeedback(true)}
          className="ml-1 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-blue-600"
          title="Kritik & Saran"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
      <FeedbackDialog open={showFeedback} onOpenChange={setShowFeedback} />
    </>
  );
};
