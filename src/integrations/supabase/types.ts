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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      credit_orders: {
        Row: {
          admin_notes: string | null
          amount_usdt: number
          created_at: string
          credits: number
          id: string
          network: string | null
          processed_at: string | null
          status: string
          txid: string | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_usdt: number
          created_at?: string
          credits: number
          id?: string
          network?: string | null
          processed_at?: string | null
          status?: string
          txid?: string | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_usdt?: number
          created_at?: string
          credits?: number
          id?: string
          network?: string | null
          processed_at?: string | null
          status?: string
          txid?: string | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      generation_tasks: {
        Row: {
          audio_url: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          external_task_id: string | null
          file_size: number | null
          id: string
          input_text: string
          model: string | null
          progress: number | null
          provider: string | null
          settings: Json | null
          status: string
          user_id: string
          voice_id: string
          voice_name: string | null
          words_count: number
        }
        Insert: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          external_task_id?: string | null
          file_size?: number | null
          id?: string
          input_text: string
          model?: string | null
          progress?: number | null
          provider?: string | null
          settings?: Json | null
          status?: string
          user_id: string
          voice_id: string
          voice_name?: string | null
          words_count?: number
        }
        Update: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          external_task_id?: string | null
          file_size?: number | null
          id?: string
          input_text?: string
          model?: string | null
          progress?: number | null
          provider?: string | null
          settings?: Json | null
          status?: string
          user_id?: string
          voice_id?: string
          voice_name?: string | null
          words_count?: number
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string | null
          credits: number
          description: string | null
          discount_percentage: number | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          offer_price: number
          real_price: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          description?: string | null
          discount_percentage?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          offer_price: number
          real_price: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          description?: string | null
          discount_percentage?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          offer_price?: number
          real_price?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_secret: boolean | null
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          is_valid: boolean | null
          key_name: string | null
          last_balance_check: string | null
          provider: string
          remaining_credits: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          is_valid?: boolean | null
          key_name?: string | null
          last_balance_check?: string | null
          provider: string
          remaining_credits?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          is_valid?: boolean | null
          key_name?: string | null
          last_balance_check?: string | null
          provider?: string
          remaining_credits?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voices: {
        Row: {
          accent: string | null
          age: string | null
          category: string | null
          created_at: string
          gender: string | null
          id: string
          is_active: boolean
          languages: string[] | null
          name: string
          preview_url: string | null
          provider: string
        }
        Insert: {
          accent?: string | null
          age?: string | null
          category?: string | null
          created_at?: string
          gender?: string | null
          id: string
          is_active?: boolean
          languages?: string[] | null
          name: string
          preview_url?: string | null
          provider?: string
        }
        Update: {
          accent?: string | null
          age?: string | null
          category?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          languages?: string[] | null
          name?: string
          preview_url?: string | null
          provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
