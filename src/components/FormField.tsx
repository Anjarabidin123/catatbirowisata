import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "textarea";
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  rows?: number;
}

const FormField = ({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  helpText,
  placeholder,
  icon,
  rows = 3
}: FormFieldProps) => {
  const inputId = label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        <Label htmlFor={inputId} className="flex items-center gap-2">
          {label}
          {required ? (
            <span className="text-destructive">*</span>
          ) : (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Opsional
            </span>
          )}
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Label>
      </div>
      
      {type === "textarea" ? (
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={required ? "border-2" : "border"}
        />
      ) : (
        <Input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={required ? "border-2" : "border"}
        />
      )}
      
      {helpText && !required && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          💡 {helpText}
        </p>
      )}
    </div>
  );
};

export default FormField;
