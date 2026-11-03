import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RupiahInputProps {
  label?: string;
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
}

export const RupiahInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "0",
  required = false,
  id,
  className = ""
}: RupiahInputProps) => {
  const formatRupiah = (angka: string) => {
    // Remove non-digit characters
    const numberString = angka.replace(/[^,\d]/g, "");
    const split = numberString.split(",");
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }

    rupiah = split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
    return rupiah;
  };

  const stringValue = typeof value === "number" ? (value > 0 ? String(value) : "") : String(value || "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatRupiah(inputValue);
    onChange(formattedValue);
  };

  const unformatRupiah = (formatted: string): number => {
    return Number(formatted.replace(/\./g, "").replace(/,/g, ".")) || 0;
  };

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">
          Rp
        </span>
        <Input
          id={id}
          type="text"
          value={stringValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className={`pl-9 ${className}`}
        />
      </div>
      {stringValue && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {unformatRupiah(stringValue).toLocaleString("id-ID", {
            style: "currency",
            currency: "IDR",
          })}
        </p>
      )}
    </div>
  );
};
