import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface TripSummary {
  trip_id: string;
  trip_name: string;
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
}

interface RingkasanPerTripProps {
  summaries: TripSummary[];
}

export const RingkasanPerTrip = ({ summaries }: RingkasanPerTripProps) => {
  const totalPemasukan = summaries.reduce((sum, t) => sum + t.pemasukan, 0);
  const totalPengeluaran = summaries.reduce((sum, t) => sum + t.pengeluaran, 0);
  const totalSaldo = totalPemasukan - totalPengeluaran;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Total Keseluruhan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Pemasukan</span>
            <span className="font-semibold text-green-600">{formatRupiah(totalPemasukan)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Pengeluaran</span>
            <span className="font-semibold text-red-600">{formatRupiah(totalPengeluaran)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Saldo</span>
            <span className={`font-bold text-lg ${totalSaldo >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatRupiah(totalSaldo)}
            </span>
          </div>
        </CardContent>
      </Card>

      {summaries.map((summary) => (
        <Card key={summary.trip_id}>
          <CardHeader>
            <CardTitle className="text-base">{summary.trip_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm">Pemasukan</span>
              </div>
              <span className="font-semibold text-green-600">{formatRupiah(summary.pemasukan)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm">Pengeluaran</span>
              </div>
              <span className="font-semibold text-red-600">{formatRupiah(summary.pengeluaran)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Saldo</span>
              <span className={`font-semibold ${summary.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatRupiah(summary.saldo)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
