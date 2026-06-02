// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      anexos_chamado: {
        Row: {
          chamado_id: string
          criado_em: string
          id: string
          nome_arquivo: string
          tamanho_mb: number
          tipo_arquivo: string
          url_arquivo: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          id?: string
          nome_arquivo: string
          tamanho_mb: number
          tipo_arquivo: string
          url_arquivo: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          id?: string
          nome_arquivo?: string
          tamanho_mb?: number
          tipo_arquivo?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'anexos_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      anexos_chamado_interno: {
        Row: {
          arquivo_url: string
          chamado_id: string
          criado_em: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number
          tipo_arquivo: string
          usuario_id: string
        }
        Insert: {
          arquivo_url: string
          chamado_id: string
          criado_em?: string
          id?: string
          nome_arquivo: string
          tamanho_bytes: number
          tipo_arquivo: string
          usuario_id: string
        }
        Update: {
          arquivo_url?: string
          chamado_id?: string
          criado_em?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number
          tipo_arquivo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'anexos_chamado_interno_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      auditoria_admin: {
        Row: {
          acao: string
          admin_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          acao: string
          admin_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          acao?: string
          admin_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      chamados: {
        Row: {
          atualizado_em: string
          carro: string | null
          criado_em: string
          data_ocorrencia: string | null
          descricao: string
          garagem: string | null
          id: string
          linha: string | null
          local_ocorrencia: string | null
          nome_cobrador: string | null
          nome_motorista: string | null
          numero_os: string | null
          operacao: string | null
          pia: string | null
          prioridade: string | null
          registro_cobrador: string | null
          registro_motorista: string | null
          responsavel_id: string | null
          status: string
          status_interno: string | null
          tipo_chamado: string | null
          titulo: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          carro?: string | null
          criado_em?: string
          data_ocorrencia?: string | null
          descricao: string
          garagem?: string | null
          id?: string
          linha?: string | null
          local_ocorrencia?: string | null
          nome_cobrador?: string | null
          nome_motorista?: string | null
          numero_os?: string | null
          operacao?: string | null
          pia?: string | null
          prioridade?: string | null
          registro_cobrador?: string | null
          registro_motorista?: string | null
          responsavel_id?: string | null
          status?: string
          status_interno?: string | null
          tipo_chamado?: string | null
          titulo: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          carro?: string | null
          criado_em?: string
          data_ocorrencia?: string | null
          descricao?: string
          garagem?: string | null
          id?: string
          linha?: string | null
          local_ocorrencia?: string | null
          nome_cobrador?: string | null
          nome_motorista?: string | null
          numero_os?: string | null
          operacao?: string | null
          pia?: string | null
          prioridade?: string | null
          registro_cobrador?: string | null
          registro_motorista?: string | null
          responsavel_id?: string | null
          status?: string
          status_interno?: string | null
          tipo_chamado?: string | null
          titulo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          arquivo_url: string
          atualizado_em: string
          chamado_id: string | null
          criado_em: string
          data: string | null
          descricao_danos: string | null
          excluido_manutencao: boolean
          formulario_id: string | null
          foto_url: string | null
          fotos_manutencao: Json | null
          fotos_urls: Json | null
          garagem: string | null
          horario: string | null
          id: string
          linha: string | null
          nome_arquivo: string
          nome_motorista: string | null
          nome_responsavel: string | null
          numero_carro: string | null
          numero_os: string | null
          ocorrencia: string | null
          orcamento_url: string | null
          registro_motorista: string | null
          registro_responsavel: string | null
          status_liberacao: string | null
          tipo_documento: string
        }
        Insert: {
          arquivo_url: string
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          excluido_manutencao?: boolean
          formulario_id?: string | null
          foto_url?: string | null
          fotos_manutencao?: Json | null
          fotos_urls?: Json | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_arquivo: string
          nome_motorista?: string | null
          nome_responsavel?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          orcamento_url?: string | null
          registro_motorista?: string | null
          registro_responsavel?: string | null
          status_liberacao?: string | null
          tipo_documento: string
        }
        Update: {
          arquivo_url?: string
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          excluido_manutencao?: boolean
          formulario_id?: string | null
          foto_url?: string | null
          fotos_manutencao?: Json | null
          fotos_urls?: Json | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_arquivo?: string
          nome_motorista?: string | null
          nome_responsavel?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          orcamento_url?: string | null
          registro_motorista?: string | null
          registro_responsavel?: string | null
          status_liberacao?: string | null
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_formulario_id_fkey'
            columns: ['formulario_id']
            isOneToOne: true
            referencedRelation: 'formularios_espelho_danos'
            referencedColumns: ['id']
          },
        ]
      }
      formularios_espelho_danos: {
        Row: {
          atualizado_em: string
          chamado_id: string | null
          criado_em: string
          data: string | null
          descricao_danos: string | null
          garagem: string | null
          horario: string | null
          id: string
          linha: string | null
          nome_motorista: string | null
          nome_vistoriador: string | null
          numero_carro: string | null
          numero_os: string | null
          ocorrencia: string | null
          registro_motorista: string | null
          registro_vistoriador: string | null
        }
        Insert: {
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_motorista?: string | null
          nome_vistoriador?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          registro_motorista?: string | null
          registro_vistoriador?: string | null
        }
        Update: {
          atualizado_em?: string
          chamado_id?: string | null
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_motorista?: string | null
          nome_vistoriador?: string | null
          numero_carro?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          registro_motorista?: string | null
          registro_vistoriador?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'formularios_espelho_danos_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      formularios_ido: {
        Row: {
          assinatura_base64: string | null
          atualizado_em: string
          chamado_id: string
          colaborador_nome: string | null
          colaborador_registro: string | null
          criado_em: string
          id: string
          protocolo_ido: string | null
          testemunha_1_endereco: string | null
          testemunha_1_nome: string | null
          testemunha_1_sg: string | null
          testemunha_1_telefone: string | null
          testemunha_2_endereco: string | null
          testemunha_2_nome: string | null
          testemunha_2_sg: string | null
          testemunha_2_telefone: string | null
          testemunha_3_endereco: string | null
          testemunha_3_nome: string | null
          testemunha_3_sg: string | null
          testemunha_3_telefone: string | null
        }
        Insert: {
          assinatura_base64?: string | null
          atualizado_em?: string
          chamado_id: string
          colaborador_nome?: string | null
          colaborador_registro?: string | null
          criado_em?: string
          id?: string
          protocolo_ido?: string | null
          testemunha_1_endereco?: string | null
          testemunha_1_nome?: string | null
          testemunha_1_sg?: string | null
          testemunha_1_telefone?: string | null
          testemunha_2_endereco?: string | null
          testemunha_2_nome?: string | null
          testemunha_2_sg?: string | null
          testemunha_2_telefone?: string | null
          testemunha_3_endereco?: string | null
          testemunha_3_nome?: string | null
          testemunha_3_sg?: string | null
          testemunha_3_telefone?: string | null
        }
        Update: {
          assinatura_base64?: string | null
          atualizado_em?: string
          chamado_id?: string
          colaborador_nome?: string | null
          colaborador_registro?: string | null
          criado_em?: string
          id?: string
          protocolo_ido?: string | null
          testemunha_1_endereco?: string | null
          testemunha_1_nome?: string | null
          testemunha_1_sg?: string | null
          testemunha_1_telefone?: string | null
          testemunha_2_endereco?: string | null
          testemunha_2_nome?: string | null
          testemunha_2_sg?: string | null
          testemunha_2_telefone?: string | null
          testemunha_3_endereco?: string | null
          testemunha_3_nome?: string | null
          testemunha_3_sg?: string | null
          testemunha_3_telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'formularios_ido_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      frota_veiculos: {
        Row: {
          atualizado_em: string
          criado_em: string
          garagem: string
          id: string
          placa: string | null
          prefixo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          garagem: string
          id?: string
          placa?: string | null
          prefixo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          garagem?: string
          id?: string
          placa?: string | null
          prefixo?: string
        }
        Relationships: []
      }
      historico_chamado: {
        Row: {
          acao: string
          chamado_id: string
          criado_em: string
          detalhes: string | null
          id: string
          usuario_id: string
        }
        Insert: {
          acao: string
          chamado_id: string
          criado_em?: string
          detalhes?: string | null
          id?: string
          usuario_id: string
        }
        Update: {
          acao?: string
          chamado_id?: string
          criado_em?: string
          detalhes?: string | null
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'historico_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      participantes_chamado: {
        Row: {
          chamado_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'participantes_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
      perfil_usuario: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          departamento: string | null
          email: string
          endereco: string | null
          foto_url: string | null
          garagem: string | null
          id: string
          nome_completo: string
          registro: string | null
          tipo_usuario: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          departamento?: string | null
          email: string
          endereco?: string | null
          foto_url?: string | null
          garagem?: string | null
          id: string
          nome_completo: string
          registro?: string | null
          tipo_usuario?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          departamento?: string | null
          email?: string
          endereco?: string | null
          foto_url?: string | null
          garagem?: string | null
          id?: string
          nome_completo?: string
          registro?: string | null
          tipo_usuario?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      respostas_chamado: {
        Row: {
          chamado_id: string
          criado_em: string
          id: string
          mensagem: string
          usuario_id: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          id?: string
          mensagem: string
          usuario_id: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          id?: string
          mensagem?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'respostas_chamado_chamado_id_fkey'
            columns: ['chamado_id']
            isOneToOne: false
            referencedRelation: 'chamados'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anexar_foto_manutencao: {
        Args: {
          p_documento_id: string
          p_foto_url: string
          p_usuario_id?: string
        }
        Returns: undefined
      }
      buscar_garagem_por_placa: { Args: { p_placa: string }; Returns: string }
      buscar_veiculo_por_placa: { Args: { p_placa: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_coc: { Args: never; Returns: boolean }
      is_juridico: { Args: never; Returns: boolean }
      is_responsavel: { Args: never; Returns: boolean }
      is_secretaria_tecnica: { Args: never; Returns: boolean }
      is_sinistro: { Args: never; Returns: boolean }
      is_sos: { Args: never; Returns: boolean }
      is_vistoriador: { Args: never; Returns: boolean }
      liberar_veiculo_manutencao: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      marcar_chamados_pendentes_por_inatividade: {
        Args: never
        Returns: undefined
      }
      ocultar_documento_manutencao: {
        Args: { p_id: string }
        Returns: undefined
      }
      registrar_boletim_ido: {
        Args: {
          p_arquivo_url: string
          p_chamado_id: string
          p_nome_arquivo: string
          p_tamanho_bytes: number
        }
        Returns: undefined
      }
      registrar_espelho_danos: {
        Args: {
          p_arquivo_url: string
          p_chamado_id: string
          p_nome_arquivo: string
          p_tamanho_bytes: number
        }
        Returns: undefined
      }
      remover_foto_manutencao: {
        Args: {
          p_documento_id: string
          p_foto_url: string
          p_usuario_id?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: anexos_chamado
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
//   url_arquivo: text (not null)
//   nome_arquivo: text (not null)
//   tipo_arquivo: text (not null)
//   tamanho_mb: numeric (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: anexos_chamado_interno
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
//   usuario_id: uuid (not null)
//   arquivo_url: text (not null)
//   nome_arquivo: text (not null)
//   tamanho_bytes: integer (not null)
//   tipo_arquivo: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: auditoria_admin
//   id: uuid (not null, default: gen_random_uuid())
//   admin_id: uuid (not null)
//   usuario_id: uuid (not null)
//   acao: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: chamados
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (not null)
//   titulo: text (not null)
//   descricao: text (not null)
//   prioridade: text (nullable)
//   status: text (not null, default: 'aberto'::text)
//   responsavel_id: uuid (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   pia: text (nullable)
//   tipo_chamado: text (nullable)
//   registro_motorista: text (nullable)
//   nome_motorista: text (nullable)
//   registro_cobrador: text (nullable)
//   nome_cobrador: text (nullable)
//   carro: text (nullable)
//   linha: text (nullable)
//   local_ocorrencia: text (nullable)
//   operacao: text (nullable)
//   numero_os: text (nullable)
//   status_interno: text (nullable)
//   garagem: text (nullable)
//   data_ocorrencia: date (nullable)
// Table: documentos
//   id: uuid (not null, default: gen_random_uuid())
//   tipo_documento: text (not null)
//   nome_arquivo: text (not null)
//   arquivo_url: text (not null)
//   registro_responsavel: text (nullable)
//   nome_responsavel: text (nullable)
//   chamado_id: uuid (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   registro_motorista: text (nullable)
//   numero_os: text (nullable)
//   foto_url: text (nullable)
//   fotos_urls: jsonb (nullable, default: '[]'::jsonb)
//   garagem: text (nullable)
//   data: date (nullable)
//   horario: time without time zone (nullable)
//   ocorrencia: text (nullable)
//   linha: text (nullable)
//   descricao_danos: text (nullable)
//   nome_motorista: text (nullable)
//   excluido_manutencao: boolean (not null, default: false)
//   numero_carro: text (nullable)
//   status_liberacao: text (nullable)
//   formulario_id: uuid (nullable)
//   orcamento_url: text (nullable)
//   fotos_manutencao: jsonb (nullable, default: '[]'::jsonb)
// Table: formularios_espelho_danos
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (nullable)
//   numero_os: text (nullable)
//   garagem: text (nullable)
//   data: date (nullable)
//   horario: time without time zone (nullable)
//   ocorrencia: text (nullable)
//   linha: text (nullable)
//   descricao_danos: text (nullable)
//   registro_vistoriador: text (nullable)
//   nome_vistoriador: text (nullable)
//   registro_motorista: text (nullable)
//   nome_motorista: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   numero_carro: text (nullable)
// Table: formularios_ido
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
//   protocolo_ido: text (nullable)
//   colaborador_nome: text (nullable)
//   colaborador_registro: text (nullable)
//   testemunha_1_nome: text (nullable)
//   testemunha_1_endereco: text (nullable)
//   testemunha_1_sg: text (nullable)
//   testemunha_1_telefone: text (nullable)
//   testemunha_2_nome: text (nullable)
//   testemunha_2_endereco: text (nullable)
//   testemunha_2_sg: text (nullable)
//   testemunha_2_telefone: text (nullable)
//   testemunha_3_nome: text (nullable)
//   testemunha_3_endereco: text (nullable)
//   testemunha_3_sg: text (nullable)
//   testemunha_3_telefone: text (nullable)
//   assinatura_base64: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: frota_veiculos
//   id: uuid (not null, default: gen_random_uuid())
//   prefixo: text (not null)
//   placa: text (nullable)
//   garagem: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: historico_chamado
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
//   acao: text (not null)
//   usuario_id: uuid (not null)
//   detalhes: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: participantes_chamado
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
//   usuario_id: uuid (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: perfil_usuario
//   id: uuid (not null)
//   email: text (not null)
//   nome_completo: text (not null)
//   whatsapp: text (nullable)
//   endereco: text (nullable)
//   tipo_usuario: text (not null, default: 'basico'::text)
//   ativo: boolean (not null, default: true)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   foto_url: text (nullable)
//   departamento: text (nullable)
//   garagem: text (nullable)
//   registro: text (nullable)
// Table: respostas_chamado
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
//   usuario_id: uuid (not null)
//   mensagem: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: anexos_chamado
//   FOREIGN KEY anexos_chamado_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY anexos_chamado_pkey: PRIMARY KEY (id)
// Table: anexos_chamado_interno
//   FOREIGN KEY anexos_chamado_interno_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY anexos_chamado_interno_pkey: PRIMARY KEY (id)
//   FOREIGN KEY anexos_chamado_interno_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: auditoria_admin
//   FOREIGN KEY auditoria_admin_admin_id_fkey: FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY auditoria_admin_pkey: PRIMARY KEY (id)
//   FOREIGN KEY auditoria_admin_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: chamados
//   PRIMARY KEY chamados_pkey: PRIMARY KEY (id)
//   CHECK chamados_prioridade_check: CHECK (((prioridade IS NULL) OR (prioridade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text, 'urgente'::text]))))
//   FOREIGN KEY chamados_responsavel_id_fkey: FOREIGN KEY (responsavel_id) REFERENCES auth.users(id) ON DELETE SET NULL
//   CHECK chamados_status_check: CHECK ((status = ANY (ARRAY['aberto'::text, 'em_atendimento'::text, 'finalizado'::text, 'Pendente'::text, 'pendente'::text, 'operacao'::text, 'unificado'::text])))
//   FOREIGN KEY chamados_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: documentos
//   FOREIGN KEY documentos_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE SET NULL
//   FOREIGN KEY documentos_formulario_id_fkey: FOREIGN KEY (formulario_id) REFERENCES formularios_espelho_danos(id) ON DELETE SET NULL
//   UNIQUE documentos_formulario_id_key: UNIQUE (formulario_id)
//   PRIMARY KEY documentos_pkey: PRIMARY KEY (id)
//   CHECK documentos_tipo_documento_check: CHECK ((tipo_documento = ANY (ARRAY['IDO'::text, 'Espelho de Danos'::text, 'Vistoria'::text])))
// Table: formularios_espelho_danos
//   FOREIGN KEY formularios_espelho_danos_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY formularios_espelho_danos_pkey: PRIMARY KEY (id)
// Table: formularios_ido
//   FOREIGN KEY formularios_ido_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY formularios_ido_pkey: PRIMARY KEY (id)
// Table: frota_veiculos
//   PRIMARY KEY frota_veiculos_pkey: PRIMARY KEY (id)
//   UNIQUE frota_veiculos_prefixo_key: UNIQUE (prefixo)
// Table: historico_chamado
//   CHECK historico_chamado_acao_check: CHECK ((acao = ANY (ARRAY['criado'::text, 'atribuido'::text, 'respondido'::text, 'finalizado'::text, 'deletado'::text, 'transferido'::text, 'reaberto'::text, 'pendente'::text])))
//   FOREIGN KEY historico_chamado_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY historico_chamado_pkey: PRIMARY KEY (id)
//   FOREIGN KEY historico_chamado_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: participantes_chamado
//   FOREIGN KEY participantes_chamado_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   UNIQUE participantes_chamado_chamado_id_usuario_id_key: UNIQUE (chamado_id, usuario_id)
//   PRIMARY KEY participantes_chamado_pkey: PRIMARY KEY (id)
//   FOREIGN KEY participantes_chamado_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: perfil_usuario
//   FOREIGN KEY perfil_usuario_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY perfil_usuario_pkey: PRIMARY KEY (id)
//   CHECK perfil_usuario_tipo_usuario_check: CHECK ((tipo_usuario = ANY (ARRAY['basico'::text, 'responsavel'::text, 'admin'::text, 'vistoriador'::text, 'coc'::text, 'sos'::text, 'juridico'::text, 'sinistro'::text, 'secretaria_tecnica'::text])))
// Table: respostas_chamado
//   FOREIGN KEY respostas_chamado_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY respostas_chamado_pkey: PRIMARY KEY (id)
//   FOREIGN KEY respostas_chamado_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE

// --- ROW LEVEL SECURITY POLICIES ---
// Table: anexos_chamado
//   Policy "anexos_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (chamado_id IN ( SELECT chamados.id    FROM chamados))
//   Policy "anexos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (chamado_id IN ( SELECT chamados.id    FROM chamados))
// Table: anexos_chamado_interno
//   Policy "anexos_internos_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR (usuario_id = auth.uid()))
//   Policy "anexos_internos_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR is_coc())
//   Policy "anexos_internos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (is_responsavel() OR is_sinistro() OR is_admin() OR is_sos() OR is_juridico() OR is_secretaria_tecnica() OR (usuario_id = auth.uid()) OR (chamado_id IN ( SELECT participantes_chamado.chamado_id    FROM participantes_chamado   WHERE (participantes_chamado.usuario_id = auth.uid()))))
//   Policy "anexos_internos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR (usuario_id = auth.uid()))
//     WITH CHECK: (is_responsavel() OR is_sinistro() OR is_admin() OR is_juridico() OR is_secretaria_tecnica() OR (usuario_id = auth.uid()))
// Table: auditoria_admin
//   Policy "admin_auditoria_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin()
//   Policy "admin_auditoria_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
// Table: chamados
//   Policy "chamados_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin())
//   Policy "chamados_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (usuario_id = auth.uid())
//   Policy "chamados_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR (responsavel_id = auth.uid()) OR is_admin() OR is_responsavel() OR is_sos() OR is_coc() OR is_juridico() OR is_secretaria_tecnica() OR (is_vistoriador() AND (garagem = ( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())))) OR (is_sinistro() AND ((( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())) IS NOT NULL) AND (( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = chamados.usuario_id)))))) OR (id IN ( SELECT participantes_chamado.chamado_id    FROM participantes_chamado   WHERE (participantes_chamado.usuario_id = auth.uid()))))
//   Policy "chamados_select_public_manutencao" (SELECT, PERMISSIVE) roles={public}
//     USING: (tipo_chamado = 'OS de Manutenção'::text)
//   Policy "chamados_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR (responsavel_id = auth.uid()) OR is_admin() OR is_sos() OR is_coc() OR (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR is_juridico() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = chamados.usuario_id))))))) OR (id IN ( SELECT participantes_chamado.chamado_id    FROM participantes_chamado   WHERE (participantes_chamado.usuario_id = auth.uid()))))
//     WITH CHECK: ((usuario_id = auth.uid()) OR (responsavel_id = auth.uid()) OR is_admin() OR is_sos() OR is_coc() OR (((status = 'aberto'::text) OR (status = 'finalizado'::text)) AND (is_responsavel() OR is_juridico() OR (is_sinistro() AND (( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())) = COALESCE(garagem, ( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = chamados.usuario_id))))))) OR (id IN ( SELECT participantes_chamado.chamado_id    FROM participantes_chamado   WHERE (participantes_chamado.usuario_id = auth.uid()))))
//   Policy "chamados_update_public_manutencao" (UPDATE, PERMISSIVE) roles={public}
//     USING: (tipo_chamado = 'OS de Manutenção'::text)
//     WITH CHECK: (tipo_chamado = 'OS de Manutenção'::text)
// Table: documentos
//   Policy "documentos_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
//   Policy "documentos_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "documentos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((NOT is_vistoriador()) OR (garagem = ( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid()))))
//   Policy "documentos_select_public_os" (SELECT, PERMISSIVE) roles={public}
//     USING: ((tipo_documento = ANY (ARRAY['Vistoria'::text, 'Espelho de Danos'::text])) AND (numero_os IS NOT NULL) AND (numero_os <> ''::text))
//   Policy "documentos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico() OR is_secretaria_tecnica())
//     WITH CHECK: ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_vistoriador() OR is_juridico() OR is_secretaria_tecnica())
// Table: formularios_espelho_danos
//   Policy "formularios_espelho_danos_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "formularios_espelho_danos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica() OR (is_vistoriador() AND (garagem = ( SELECT perfil_usuario.garagem    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())))))
//   Policy "formularios_espelho_danos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
//     WITH CHECK: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
// Table: formularios_ido
//   Policy "formularios_ido_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "formularios_ido_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico() OR is_secretaria_tecnica())
//   Policy "formularios_ido_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
//     WITH CHECK: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid()))) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
// Table: frota_veiculos
//   Policy "frota_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_admin() OR ((auth.jwt() ->> 'email'::text) = 'ti@viasudeste.com'::text))
//   Policy "frota_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_admin() OR ((auth.jwt() ->> 'email'::text) = 'ti@viasudeste.com'::text))
//   Policy "frota_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "frota_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (is_admin() OR ((auth.jwt() ->> 'email'::text) = 'ti@viasudeste.com'::text))
//     WITH CHECK: (is_admin() OR ((auth.jwt() ->> 'email'::text) = 'ti@viasudeste.com'::text))
// Table: historico_chamado
//   Policy "Permitir INSERT para responsáveis e admin" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() IS NOT NULL)
//   Policy "Permitir SELECT para admin e responsáveis" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((( SELECT perfil_usuario.tipo_usuario    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())) = ANY (ARRAY['admin'::text, 'responsavel'::text, 'sinistro'::text, 'juridico'::text])) OR (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.usuario_id = auth.uid()))) OR (chamado_id IN ( SELECT participantes_chamado.chamado_id    FROM participantes_chamado   WHERE (participantes_chamado.usuario_id = auth.uid()))))
// Table: participantes_chamado
//   Policy "participantes_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin() OR is_responsavel() OR is_sinistro() OR is_juridico())
// Table: perfil_usuario
//   Policy "perfil_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "perfil_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (id = auth.uid())
//     WITH CHECK: (id = auth.uid())
// Table: respostas_chamado
//   Policy "respostas_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: ((usuario_id = auth.uid()) AND (chamado_id IN ( SELECT chamados.id    FROM chamados)))
//   Policy "respostas_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR (chamado_id IN ( SELECT chamados.id    FROM chamados)))

// --- DATABASE FUNCTIONS ---
// FUNCTION anexar_foto_manutencao(uuid, text, uuid)
//   CREATE OR REPLACE FUNCTION public.anexar_foto_manutencao(p_documento_id uuid, p_foto_url text, p_usuario_id uuid DEFAULT NULL::uuid)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//     DECLARE
//       v_chamado_id uuid;
//       v_admin_id uuid;
//       v_fotos jsonb;
//     BEGIN
//       -- 1. Get the current fotos and chamado_id
//       SELECT chamado_id, fotos_manutencao INTO v_chamado_id, v_fotos
//       FROM public.documentos
//       WHERE id = p_documento_id;
//
//       IF v_fotos IS NULL THEN
//         v_fotos := '[]'::jsonb;
//       END IF;
//
//       -- Append new photo URL
//       v_fotos := v_fotos || jsonb_build_array(p_foto_url);
//
//       -- 2. Update the document
//       UPDATE public.documentos
//       SET fotos_manutencao = v_fotos,
//           atualizado_em = NOW()
//       WHERE id = p_documento_id;
//
//       -- 3. Add history if chamado_id exists
//       IF v_chamado_id IS NOT NULL THEN
//         -- Determine user for audit
//         IF p_usuario_id IS NOT NULL THEN
//           v_admin_id := p_usuario_id;
//         ELSE
//           -- Fallback to system/admin user
//           SELECT id INTO v_admin_id
//           FROM public.perfil_usuario
//           WHERE tipo_usuario = 'admin'
//           ORDER BY criado_em ASC
//           LIMIT 1;
//
//           IF v_admin_id IS NULL THEN
//             SELECT id INTO v_admin_id
//             FROM public.perfil_usuario
//             WHERE tipo_usuario = 'responsavel'
//             ORDER BY criado_em ASC
//             LIMIT 1;
//           END IF;
//         END IF;
//
//         IF v_admin_id IS NOT NULL THEN
//           INSERT INTO public.historico_chamado (
//             chamado_id,
//             acao,
//             usuario_id,
//             detalhes
//           ) VALUES (
//             v_chamado_id,
//             'respondido',
//             v_admin_id,
//             'Evidência de manutenção (foto) anexada à OS.'
//           );
//         END IF;
//       END IF;
//     END;
//     $function$
//
// FUNCTION buscar_garagem_por_placa(text)
//   CREATE OR REPLACE FUNCTION public.buscar_garagem_por_placa(p_placa text)
//    RETURNS text
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_garagem text;
//   BEGIN
//     SELECT garagem INTO v_garagem
//     FROM public.frota_veiculos
//     WHERE regexp_replace(placa, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || p_placa || '%'
//     LIMIT 1;
//
//     RETURN v_garagem;
//   END;
//   $function$
//
// FUNCTION buscar_veiculo_por_placa(text)
//   CREATE OR REPLACE FUNCTION public.buscar_veiculo_por_placa(p_placa text)
//    RETURNS jsonb
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_result jsonb;
//   BEGIN
//     SELECT jsonb_build_object('garagem', garagem, 'prefixo', prefixo) INTO v_result
//     FROM public.frota_veiculos
//     WHERE regexp_replace(placa, '[^a-zA-Z0-9]', '', 'g') ILIKE '%' || p_placa || '%'
//     LIMIT 1;
//
//     RETURN v_result;
//   END;
//   $function$
//
// FUNCTION handle_new_user()
//   CREATE OR REPLACE FUNCTION public.handle_new_user()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     INSERT INTO public.perfil_usuario (id, email, nome_completo, tipo_usuario)
//     VALUES (
//       NEW.id,
//       NEW.email,
//       COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
//       'basico'
//     )
//     ON CONFLICT (id) DO NOTHING;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION is_admin()
//   CREATE OR REPLACE FUNCTION public.is_admin()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'admin'
//     );
//   END;
//   $function$
//
// FUNCTION is_coc()
//   CREATE OR REPLACE FUNCTION public.is_coc()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'coc'
//     );
//   END;
//   $function$
//
// FUNCTION is_juridico()
//   CREATE OR REPLACE FUNCTION public.is_juridico()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'juridico'
//     );
//   END;
//   $function$
//
// FUNCTION is_responsavel()
//   CREATE OR REPLACE FUNCTION public.is_responsavel()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'responsavel'
//     );
//   END;
//   $function$
//
// FUNCTION is_secretaria_tecnica()
//   CREATE OR REPLACE FUNCTION public.is_secretaria_tecnica()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'secretaria_tecnica'
//     );
//   END;
//   $function$
//
// FUNCTION is_sinistro()
//   CREATE OR REPLACE FUNCTION public.is_sinistro()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'sinistro'
//     );
//   END;
//   $function$
//
// FUNCTION is_sos()
//   CREATE OR REPLACE FUNCTION public.is_sos()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'sos'
//     );
//   END;
//   $function$
//
// FUNCTION is_vistoriador()
//   CREATE OR REPLACE FUNCTION public.is_vistoriador()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN EXISTS (
//       SELECT 1 FROM public.perfil_usuario WHERE id = auth.uid() AND tipo_usuario = 'vistoriador'
//     );
//   END;
//   $function$
//
// FUNCTION liberar_veiculo_manutencao(uuid, text)
//   CREATE OR REPLACE FUNCTION public.liberar_veiculo_manutencao(p_id uuid, p_status text)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//     BEGIN
//       IF p_status = 'Liberado (Sem Pendências)' OR p_status = 'Liberado' THEN
//         UPDATE public.documentos
//         SET excluido_manutencao = TRUE,
//             status_liberacao = p_status
//         WHERE id = p_id;
//       ELSE
//         UPDATE public.documentos
//         SET excluido_manutencao = FALSE,
//             status_liberacao = p_status
//         WHERE id = p_id;
//       END IF;
//     END;
//     $function$
//
// FUNCTION marcar_chamados_pendentes_por_inatividade()
//   CREATE OR REPLACE FUNCTION public.marcar_chamados_pendentes_por_inatividade()
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_chamado_id uuid;
//     v_admin_id uuid;
//     v_count integer := 0;
//   BEGIN
//     -- Pega o ID de um administrador para registrar a alteração no histórico
//     SELECT id INTO v_admin_id
//     FROM public.perfil_usuario
//     WHERE tipo_usuario = 'admin'
//     ORDER BY criado_em ASC
//     LIMIT 1;
//
//     -- Se não encontrar um admin, pega qualquer usuário responsável (fallback de segurança)
//     IF v_admin_id IS NULL THEN
//       SELECT id INTO v_admin_id
//       FROM public.perfil_usuario
//       WHERE tipo_usuario = 'responsavel'
//       ORDER BY criado_em ASC
//       LIMIT 1;
//     END IF;
//
//     FOR v_chamado_id IN
//       SELECT c.id
//       FROM public.chamados c
//       WHERE c.status NOT IN ('finalizado', 'Pendente', 'pendente', 'deletado')
//         AND c.atualizado_em < NOW() - INTERVAL '30 days'
//         AND NOT EXISTS (
//           SELECT 1 FROM public.respostas_chamado r WHERE r.chamado_id = c.id AND r.criado_em >= NOW() - INTERVAL '30 days'
//         )
//         AND NOT EXISTS (
//           SELECT 1 FROM public.anexos_chamado a WHERE a.chamado_id = c.id AND a.criado_em >= NOW() - INTERVAL '30 days'
//         )
//         AND NOT EXISTS (
//           SELECT 1 FROM public.anexos_chamado_interno ai WHERE ai.chamado_id = c.id AND ai.criado_em >= NOW() - INTERVAL '30 days'
//         )
//     LOOP
//       -- Atualiza o status do chamado
//       UPDATE public.chamados
//       SET
//         status = 'pendente',
//         atualizado_em = NOW()
//       WHERE id = v_chamado_id;
//
//       -- Insere o registro de histórico, se tivermos um usuário válido
//       IF v_admin_id IS NOT NULL THEN
//         INSERT INTO public.historico_chamado (chamado_id, acao, usuario_id, detalhes)
//         VALUES (v_chamado_id, 'pendente', v_admin_id, 'Chamado movido para Pendente, pois não houve interação por mais de 30 dias.');
//       END IF;
//
//       v_count := v_count + 1;
//     END LOOP;
//
//     RAISE NOTICE 'Chamados inativos movidos para pendente: %', v_count;
//   END;
//   $function$
//
// FUNCTION ocultar_documento_manutencao(uuid)
//   CREATE OR REPLACE FUNCTION public.ocultar_documento_manutencao(p_id uuid)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     UPDATE public.documentos
//     SET excluido_manutencao = TRUE
//     WHERE id = p_id;
//   END;
//   $function$
//
// FUNCTION registrar_boletim_ido(uuid, text, text, integer)
//   CREATE OR REPLACE FUNCTION public.registrar_boletim_ido(p_chamado_id uuid, p_nome_arquivo text, p_arquivo_url text, p_tamanho_bytes integer)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_responsavel_id uuid;
//     v_usuario_id uuid;
//     v_alvo_id uuid;
//   BEGIN
//     -- Get ticket details
//     SELECT responsavel_id, usuario_id INTO v_responsavel_id, v_usuario_id
//     FROM public.chamados
//     WHERE id = p_chamado_id;
//
//     -- Determine the user ID to associate the attachment with
//     -- If there's a responsible, use it, otherwise fallback to the creator
//     v_alvo_id := COALESCE(v_responsavel_id, v_usuario_id);
//
//     IF v_alvo_id IS NULL THEN
//       RAISE EXCEPTION 'Chamado não encontrado ou sem usuários vinculados';
//     END IF;
//
//     -- Insert into anexos_chamado_interno
//     INSERT INTO public.anexos_chamado_interno (
//       chamado_id,
//       usuario_id,
//       nome_arquivo,
//       arquivo_url,
//       tipo_arquivo,
//       tamanho_bytes
//     ) VALUES (
//       p_chamado_id,
//       v_alvo_id,
//       p_nome_arquivo,
//       p_arquivo_url,
//       'application/pdf',
//       p_tamanho_bytes
//     );
//
//     -- Insert notification into historico_chamado
//     INSERT INTO public.historico_chamado (
//       chamado_id,
//       usuario_id,
//       acao,
//       detalhes
//     ) VALUES (
//       p_chamado_id,
//       v_alvo_id,
//       'respondido',
//       'Boletim de Ocorrência preenchido e anexado com sucesso.'
//     );
//   END;
//   $function$
//
// FUNCTION registrar_espelho_danos(uuid, text, text, integer)
//   CREATE OR REPLACE FUNCTION public.registrar_espelho_danos(p_chamado_id uuid, p_nome_arquivo text, p_arquivo_url text, p_tamanho_bytes integer)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_responsavel_id uuid;
//     v_usuario_id uuid;
//     v_alvo_id uuid;
//   BEGIN
//     -- Get ticket details
//     SELECT responsavel_id, usuario_id INTO v_responsavel_id, v_usuario_id
//     FROM public.chamados
//     WHERE id = p_chamado_id;
//
//     -- Determine the user ID to associate the attachment with
//     v_alvo_id := COALESCE(v_responsavel_id, v_usuario_id);
//
//     IF v_alvo_id IS NULL THEN
//       RAISE EXCEPTION 'Chamado não encontrado ou sem usuários vinculados';
//     END IF;
//
//     -- Insert into anexos_chamado_interno
//     INSERT INTO public.anexos_chamado_interno (
//       chamado_id,
//       usuario_id,
//       nome_arquivo,
//       arquivo_url,
//       tipo_arquivo,
//       tamanho_bytes
//     ) VALUES (
//       p_chamado_id,
//       v_alvo_id,
//       p_nome_arquivo,
//       p_arquivo_url,
//       'application/pdf',
//       p_tamanho_bytes
//     );
//
//     -- Insert notification into historico_chamado
//     INSERT INTO public.historico_chamado (
//       chamado_id,
//       usuario_id,
//       acao,
//       detalhes
//     ) VALUES (
//       p_chamado_id,
//       v_alvo_id,
//       'respondido',
//       'Espelho de Danos preenchido e anexado com sucesso.'
//     );
//   END;
//   $function$
//
// FUNCTION remover_foto_manutencao(uuid, text, uuid)
//   CREATE OR REPLACE FUNCTION public.remover_foto_manutencao(p_documento_id uuid, p_foto_url text, p_usuario_id uuid DEFAULT NULL::uuid)
//    RETURNS void
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_chamado_id uuid;
//     v_admin_id uuid;
//   BEGIN
//     -- 1. Get the chamado_id
//     SELECT chamado_id INTO v_chamado_id
//     FROM public.documentos
//     WHERE id = p_documento_id;
//
//     -- 2. Update the document by removing the specific URL from the JSONB array
//     UPDATE public.documentos
//     SET fotos_manutencao = COALESCE(fotos_manutencao, '[]'::jsonb) - p_foto_url,
//         atualizado_em = NOW()
//     WHERE id = p_documento_id;
//
//     -- 3. Add history if chamado_id exists
//     IF v_chamado_id IS NOT NULL THEN
//       -- Determine user for audit
//       IF p_usuario_id IS NOT NULL THEN
//         v_admin_id := p_usuario_id;
//       ELSE
//         -- Fallback to system/admin user
//         SELECT id INTO v_admin_id
//         FROM public.perfil_usuario
//         WHERE tipo_usuario = 'admin'
//         ORDER BY criado_em ASC
//         LIMIT 1;
//
//         IF v_admin_id IS NULL THEN
//           SELECT id INTO v_admin_id
//           FROM public.perfil_usuario
//           WHERE tipo_usuario = 'responsavel'
//           ORDER BY criado_em ASC
//           LIMIT 1;
//         END IF;
//       END IF;
//
//       IF v_admin_id IS NOT NULL THEN
//         INSERT INTO public.historico_chamado (
//           chamado_id,
//           acao,
//           usuario_id,
//           detalhes
//         ) VALUES (
//           v_chamado_id,
//           'respondido',
//           v_admin_id,
//           'Evidência de manutenção (foto) removida da OS.'
//         );
//       END IF;
//     END IF;
//   END;
//   $function$
//
// FUNCTION rls_auto_enable()
//   CREATE OR REPLACE FUNCTION public.rls_auto_enable()
//    RETURNS event_trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'pg_catalog'
//   AS $function$
//   DECLARE
//     cmd record;
//   BEGIN
//     FOR cmd IN
//       SELECT *
//       FROM pg_event_trigger_ddl_commands()
//       WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
//         AND object_type IN ('table','partitioned table')
//     LOOP
//        IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
//         BEGIN
//           EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
//           RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
//         EXCEPTION
//           WHEN OTHERS THEN
//             RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
//         END;
//        ELSE
//           RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
//        END IF;
//     END LOOP;
//   END;
//   $function$
//
// FUNCTION set_garagem_from_profile()
//   CREATE OR REPLACE FUNCTION public.set_garagem_from_profile()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF NEW.garagem IS NULL OR NEW.garagem = '' THEN
//       SELECT garagem INTO NEW.garagem
//       FROM public.perfil_usuario
//       WHERE id = auth.uid();
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION sync_chamado_status_interno()
//   CREATE OR REPLACE FUNCTION public.sync_chamado_status_interno()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     v_departamento TEXT;
//   BEGIN
//     IF NEW.responsavel_id IS NOT NULL THEN
//       SELECT departamento INTO v_departamento
//       FROM public.perfil_usuario
//       WHERE id = NEW.responsavel_id;
//
//       NEW.status_interno := v_departamento;
//     ELSE
//       NEW.status_interno := NULL;
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION update_documentos_atualizado_em()
//   CREATE OR REPLACE FUNCTION public.update_documentos_atualizado_em()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     NEW.atualizado_em = NOW();
//     RETURN NEW;
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: chamados
//   trg_chamados_set_garagem: CREATE TRIGGER trg_chamados_set_garagem BEFORE INSERT ON public.chamados FOR EACH ROW EXECUTE FUNCTION set_garagem_from_profile()
//   trigger_sync_chamado_status_interno: CREATE TRIGGER trigger_sync_chamado_status_interno BEFORE INSERT OR UPDATE OF responsavel_id ON public.chamados FOR EACH ROW EXECUTE FUNCTION sync_chamado_status_interno()
// Table: documentos
//   trg_documentos_set_garagem: CREATE TRIGGER trg_documentos_set_garagem BEFORE INSERT ON public.documentos FOR EACH ROW EXECUTE FUNCTION set_garagem_from_profile()
//   update_documentos_atualizado_em_trigger: CREATE TRIGGER update_documentos_atualizado_em_trigger BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION update_documentos_atualizado_em()
// Table: formularios_espelho_danos
//   trg_formularios_espelho_danos_set_garagem: CREATE TRIGGER trg_formularios_espelho_danos_set_garagem BEFORE INSERT ON public.formularios_espelho_danos FOR EACH ROW EXECUTE FUNCTION set_garagem_from_profile()

// --- INDEXES ---
// Table: chamados
//   CREATE INDEX idx_chamados_carro ON public.chamados USING btree (carro)
//   CREATE INDEX idx_chamados_data_ocorrencia ON public.chamados USING btree (data_ocorrencia)
//   CREATE INDEX idx_chamados_numero_os ON public.chamados USING btree (numero_os)
//   CREATE INDEX idx_chamados_status ON public.chamados USING btree (status)
// Table: documentos
//   CREATE INDEX documentos_chamado_id_idx ON public.documentos USING btree (chamado_id)
//   CREATE INDEX documentos_formulario_id_idx ON public.documentos USING btree (formulario_id)
//   CREATE UNIQUE INDEX documentos_formulario_id_key ON public.documentos USING btree (formulario_id)
//   CREATE INDEX documentos_registro_responsavel_idx ON public.documentos USING btree (registro_responsavel)
//   CREATE INDEX documentos_tipo_documento_idx ON public.documentos USING btree (tipo_documento)
//   CREATE INDEX idx_documentos_numero_os ON public.documentos USING btree (numero_os)
// Table: formularios_espelho_danos
//   CREATE INDEX formularios_espelho_danos_chamado_id_idx ON public.formularios_espelho_danos USING btree (chamado_id)
// Table: formularios_ido
//   CREATE INDEX formularios_ido_chamado_id_idx ON public.formularios_ido USING btree (chamado_id)
//   CREATE INDEX formularios_ido_protocolo_ido_idx ON public.formularios_ido USING btree (protocolo_ido)
// Table: frota_veiculos
//   CREATE INDEX frota_veiculos_placa_idx ON public.frota_veiculos USING btree (placa)
//   CREATE UNIQUE INDEX frota_veiculos_prefixo_key ON public.frota_veiculos USING btree (prefixo)
// Table: participantes_chamado
//   CREATE UNIQUE INDEX participantes_chamado_chamado_id_usuario_id_key ON public.participantes_chamado USING btree (chamado_id, usuario_id)
