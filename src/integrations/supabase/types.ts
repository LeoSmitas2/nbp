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
      anuncios_monitorados: {
        Row: {
          cliente_id: string | null
          id: string
          marketplace_id: string
          origem: Database["public"]["Enums"]["ad_origin"]
          preco_detectado: number
          preco_minimo: number
          produto_id: string
          status: Database["public"]["Enums"]["ad_status"]
          ultima_atualizacao: string
          url: string
        }
        Insert: {
          cliente_id?: string | null
          id?: string
          marketplace_id: string
          origem: Database["public"]["Enums"]["ad_origin"]
          preco_detectado: number
          preco_minimo: number
          produto_id: string
          status: Database["public"]["Enums"]["ad_status"]
          ultima_atualizacao?: string
          url: string
        }
        Update: {
          cliente_id?: string | null
          id?: string
          marketplace_id?: string
          origem?: Database["public"]["Enums"]["ad_origin"]
          preco_detectado?: number
          preco_minimo?: number
          produto_id?: string
          status?: Database["public"]["Enums"]["ad_status"]
          ultima_atualizacao?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_monitorados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncios_monitorados_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncios_monitorados_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      denuncias: {
        Row: {
          cliente_id: string
          comentario_admin: string | null
          created_at: string
          id: string
          marketplace_id: string
          observacoes: string | null
          preco_informado: number
          produto_id: string
          status: Database["public"]["Enums"]["complaint_status"]
          url: string
        }
        Insert: {
          cliente_id: string
          comentario_admin?: string | null
          created_at?: string
          id?: string
          marketplace_id: string
          observacoes?: string | null
          preco_informado: number
          produto_id: string
          status?: Database["public"]["Enums"]["complaint_status"]
          url: string
        }
        Update: {
          cliente_id?: string
          comentario_admin?: string | null
          created_at?: string
          id?: string
          marketplace_id?: string
          observacoes?: string | null
          preco_informado?: number
          produto_id?: string
          status?: Database["public"]["Enums"]["complaint_status"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "denuncias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denuncias_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplaces: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          logo_url: string | null
          nome: string
          url_base: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome: string
          url_base: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome?: string
          url_base?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          preco_minimo: number
          sku: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          preco_minimo: number
          sku: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          preco_minimo?: number
          sku?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string
          empresa: string | null
          id: string
          lojas_marketplaces: Json | null
          name: string
          nome_contato: string | null
          telefone_contato: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email: string
          empresa?: string | null
          id: string
          lojas_marketplaces?: Json | null
          name: string
          nome_contato?: string | null
          telefone_contato?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          id?: string
          lojas_marketplaces?: Json | null
          name?: string
          nome_contato?: string | null
          telefone_contato?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      ad_origin: "Denúncia" | "Manual"
      ad_status: "OK" | "Abaixo do mínimo"
      app_role: "ADMIN" | "CLIENT"
      complaint_status: "Solicitada" | "Em andamento" | "Resolvida"
      user_status: "Pendente" | "Aprovado" | "Rejeitado"
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
      ad_origin: ["Denúncia", "Manual"],
      ad_status: ["OK", "Abaixo do mínimo"],
      app_role: ["ADMIN", "CLIENT"],
      complaint_status: ["Solicitada", "Em andamento", "Resolvida"],
      user_status: ["Pendente", "Aprovado", "Rejeitado"],
    },
  },
} as const
