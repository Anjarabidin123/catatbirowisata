export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      destinations: {
        Row: {
          created_at: string
          deskripsi: string | null
          durasi_standar: number | null
          estimasi_biaya: number | null
          id: string
          kategori: string | null
          lokasi: string | null
          nama_destinasi: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          durasi_standar?: number | null
          estimasi_biaya?: number | null
          id?: string
          kategori?: string | null
          lokasi?: string | null
          nama_destinasi: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          durasi_standar?: number | null
          estimasi_biaya?: number | null
          id?: string
          kategori?: string | null
          lokasi?: string | null
          nama_destinasi?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      keuangan: {
        Row: {
          cashback: number | null
          created_at: string | null
          harga_satuan: number | null
          id: string
          jenis: string
          jumlah: number
          jumlah_item: number | null
          keterangan: string | null
          tanggal: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          cashback?: number | null
          created_at?: string | null
          harga_satuan?: number | null
          id?: string
          jenis: string
          jumlah: number
          jumlah_item?: number | null
          keterangan?: string | null
          tanggal?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          cashback?: number | null
          created_at?: string | null
          harga_satuan?: number | null
          id?: string
          jenis?: string
          jumlah?: number
          jumlah_item?: number | null
          keterangan?: string | null
          tanggal?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keuangan_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          id: string
          judul: string
          konten: string
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          judul: string
          konten: string
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          judul?: string
          konten?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          is_done: boolean | null
          judul: string
          keterangan: string | null
          tanggal_waktu: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean | null
          judul: string
          keterangan?: string | null
          tanggal_waktu: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean | null
          judul?: string
          keterangan?: string | null
          tanggal_waktu?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      rundown_acara: {
        Row: {
          created_at: string
          hari_ke: number
          id: string
          jam_mulai: string
          jam_selesai: string
          judul_acara: string
          keterangan: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hari_ke: number
          id?: string
          jam_mulai: string
          jam_selesai: string
          judul_acara: string
          keterangan?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hari_ke?: number
          id?: string
          jam_mulai?: string
          jam_selesai?: string
          judul_acara?: string
          keterangan?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rundown_acara_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_destination_notes: {
        Row: {
          catatan: string
          created_at: string
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          catatan: string
          created_at?: string
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          catatan?: string
          created_at?: string
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_destination_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_destinations: {
        Row: {
          catatan: string | null
          created_at: string
          destination_id: string
          hari_ke: number
          id: string
          jam_mulai: string | null
          jam_selesai: string | null
          status: string | null
          trip_id: string
          urutan: number
          user_id: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          destination_id: string
          hari_ke: number
          id?: string
          jam_mulai?: string | null
          jam_selesai?: string | null
          status?: string | null
          trip_id: string
          urutan?: number
          user_id: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          destination_id?: string
          hari_ke?: number
          id?: string
          jam_mulai?: string | null
          jam_selesai?: string | null
          status?: string | null
          trip_id?: string
          urutan?: number
          user_id?: string
        }
        Relationships: []
      }
      trip_price_notes: {
        Row: {
          catatan: string | null
          created_at: string
          id: string
          jumlah: number
          keterangan: string
          trip_id: string
          user_id: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          id?: string
          jumlah: number
          keterangan: string
          trip_id: string
          user_id: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          id?: string
          jumlah?: number
          keterangan?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_price_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_vehicles: {
        Row: {
          cashback: number | null
          created_at: string
          dp: number
          harga_per_bus: number
          id: string
          jumlah_penumpang_per_bus: number
          nama_po: string
          trip_id: string
          user_id: string
        }
        Insert: {
          cashback?: number | null
          created_at?: string
          dp?: number
          harga_per_bus?: number
          id?: string
          jumlah_penumpang_per_bus?: number
          nama_po: string
          trip_id: string
          user_id: string
        }
        Update: {
          cashback?: number | null
          created_at?: string
          dp?: number
          harga_per_bus?: number
          id?: string
          jumlah_penumpang_per_bus?: number
          nama_po?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          budget_estimasi: number | null
          catatan: string | null
          created_at: string | null
          id: string
          jumlah_penumpang: number | null
          nama_driver: string | null
          nama_kendaraan: string | null
          nama_trip: string
          nomor_polisi: string | null
          tanggal: string
          tanggal_selesai: string | null
          tujuan: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget_estimasi?: number | null
          catatan?: string | null
          created_at?: string | null
          id?: string
          jumlah_penumpang?: number | null
          nama_driver?: string | null
          nama_kendaraan?: string | null
          nama_trip: string
          nomor_polisi?: string | null
          tanggal: string
          tanggal_selesai?: string | null
          tujuan: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget_estimasi?: number | null
          catatan?: string | null
          created_at?: string | null
          id?: string
          jumlah_penumpang?: number | null
          nama_driver?: string | null
          nama_kendaraan?: string | null
          nama_trip?: string
          nomor_polisi?: string | null
          tanggal?: string
          tanggal_selesai?: string | null
          tujuan?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
