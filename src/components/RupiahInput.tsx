import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const formatRupiahNumber = (angka: string | number | null | undefined): string => {
  if (angka === null || angka === undefined || angka === "") return "";
  const str = String(angka);
  // Remove non-digit characters
  const numberString = str.replace(/[^,\d]/g, "");
  if (!numberString) return "";
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

export const unformatRupiah = (formatted: string | number | null | undefined): number => {
  if (typeof formatted === "number") return formatted;
  if (!formatted) return 0;
  return Number(String(formatted).replace(/\./g, "").replace(/,/g, ".")) || 0;
};

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
  // Selalu tampilkan angka dengan titik pemisah ribuan otomatis (cth: 360000 -> 360.000)
  const displayValue = formatRupiahNumber(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatRupiahNumber(inputValue);
    onChange(formattedValue);
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
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className={`pl-9 ${className}`}
        />
      </div>
      {displayValue && (
        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
          {unformatRupiah(displayValue).toLocaleString("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          })}
        </p>
      )}
    </div>
  );
};
