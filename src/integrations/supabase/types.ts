export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          id: string
          nome: string
          senha_hash: string
          tipo_usuario: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          nome: string
          senha_hash: string
          tipo_usuario?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          senha_hash?: string
          tipo_usuario?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean | null
          cep: string | null
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          cpf: string | null
          created_at: string | null
          data_admissao: string | null
          email: string | null
          endereco: string | null
          horas_trabalhadas: number | null
          id: string
          meta_hora: number | null
          nome: string
          salario: number | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          email?: string | null
          endereco?: string | null
          horas_trabalhadas?: number | null
          id?: string
          meta_hora?: number | null
          nome: string
          salario?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string | null
          data_admissao?: string | null
          email?: string | null
          endereco?: string | null
          horas_trabalhadas?: number | null
          id?: string
          meta_hora?: number | null
          nome?: string
          salario?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          tipo: string | null
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          custo_producao: number | null
          data_abertura: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string
          id: string
          motivo_parada: string | null
          numero_os: string
          observacoes: string | null
          prioridade: string | null
          status: string | null
          tempo_execucao_previsto: number | null
          tempo_execucao_real: number | null
          tempo_parada: number | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          custo_producao?: number | null
          data_abertura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao: string
          id?: string
          motivo_parada?: string | null
          numero_os: string
          observacoes?: string | null
          prioridade?: string | null
          status?: string | null
          tempo_execucao_previsto?: number | null
          tempo_execucao_real?: number | null
          tempo_parada?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          custo_producao?: number | null
          data_abertura?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string
          id?: string
          motivo_parada?: string | null
          numero_os?: string
          observacoes?: string | null
          prioridade?: string | null
          status?: string | null
          tempo_execucao_previsto?: number | null
          tempo_execucao_real?: number | null
          tempo_parada?: number | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      os_colaboradores: {
        Row: {
          ativo: boolean | null
          colaborador_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          horas_trabalhadas: number | null
          id: string
          os_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          colaborador_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          horas_trabalhadas?: number | null
          id?: string
          os_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          colaborador_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          horas_trabalhadas?: number | null
          id?: string
          os_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_colaboradores_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_colaboradores_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_produtos: {
        Row: {
          created_at: string | null
          id: string
          os_id: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          os_id?: string | null
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          subtotal: number
        }
        Update: {
          created_at?: string | null
          id?: string
          os_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "os_produtos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_tempo: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          horas_calculadas: number | null
          id: string
          motivo: string | null
          os_id: string | null
          tipo: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          horas_calculadas?: number | null
          id?: string
          motivo?: string | null
          os_id?: string | null
          tipo?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          horas_calculadas?: number | null
          id?: string
          motivo?: string | null
          os_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_tempo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_tempo_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          estoque: number | null
          id: string
          nome: string
          percentual_global: number | null
          preco_unitario: number
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estoque?: number | null
          id?: string
          nome: string
          percentual_global?: number | null
          preco_unitario: number
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          estoque?: number | null
          id?: string
          nome?: string
          percentual_global?: number | null
          preco_unitario?: number
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      retrabalhos: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          data_retrabalho: string | null
          horas_abatidas: number
          id: string
          motivo: string
          observacoes: string | null
          os_id: string | null
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string | null
          data_retrabalho?: string | null
          horas_abatidas: number
          id?: string
          motivo: string
          observacoes?: string | null
          os_id?: string | null
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string | null
          data_retrabalho?: string | null
          horas_abatidas?: number
          id?: string
          motivo?: string
          observacoes?: string | null
          os_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retrabalhos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrabalhos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
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
