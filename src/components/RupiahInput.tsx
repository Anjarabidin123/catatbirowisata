import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RupiahInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export const RupiahInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "0",
  required = false,
  id 
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
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          Rp
        </span>
        <Input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className="pl-10"
        />
      </div>
      {value && (
        <p className="text-xs text-muted-foreground mt-1">
          {unformatRupiah(value).toLocaleString("id-ID", {
            style: "currency",
            currency: "IDR",
          })}
        </p>
      )}
    </div>
  );
};
