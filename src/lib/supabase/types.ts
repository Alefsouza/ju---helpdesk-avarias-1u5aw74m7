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
          criado_em: string
          descricao: string
          id: string
          pia: string | null
          prioridade: string | null
          responsavel_id: string | null
          status: string
          tipo_chamado: string | null
          titulo: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao: string
          id?: string
          pia?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string
          tipo_chamado?: string | null
          titulo: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          id?: string
          pia?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string
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
          foto_url: string | null
          fotos_urls: Json | null
          garagem: string | null
          horario: string | null
          id: string
          linha: string | null
          nome_arquivo: string
          nome_motorista: string | null
          nome_responsavel: string | null
          numero_os: string | null
          ocorrencia: string | null
          registro_motorista: string | null
          registro_responsavel: string | null
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
          foto_url?: string | null
          fotos_urls?: Json | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_arquivo: string
          nome_motorista?: string | null
          nome_responsavel?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          registro_motorista?: string | null
          registro_responsavel?: string | null
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
          foto_url?: string | null
          fotos_urls?: Json | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_arquivo?: string
          nome_motorista?: string | null
          nome_responsavel?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          registro_motorista?: string | null
          registro_responsavel?: string | null
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
        ]
      }
      formularios_espelho_danos: {
        Row: {
          atualizado_em: string
          chamado_id: string
          criado_em: string
          data: string | null
          descricao_danos: string | null
          garagem: string | null
          horario: string | null
          id: string
          linha: string | null
          nome_motorista: string | null
          nome_vistoriador: string | null
          numero_os: string | null
          ocorrencia: string | null
          registro_motorista: string | null
          registro_vistoriador: string | null
        }
        Insert: {
          atualizado_em?: string
          chamado_id: string
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_motorista?: string | null
          nome_vistoriador?: string | null
          numero_os?: string | null
          ocorrencia?: string | null
          registro_motorista?: string | null
          registro_vistoriador?: string | null
        }
        Update: {
          atualizado_em?: string
          chamado_id?: string
          criado_em?: string
          data?: string | null
          descricao_danos?: string | null
          garagem?: string | null
          horario?: string | null
          id?: string
          linha?: string | null
          nome_motorista?: string | null
          nome_vistoriador?: string | null
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
      perfil_usuario: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          email: string
          endereco: string | null
          foto_url: string | null
          id: string
          nome_completo: string
          tipo_usuario: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email: string
          endereco?: string | null
          foto_url?: string | null
          id: string
          nome_completo: string
          tipo_usuario?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          email?: string
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome_completo?: string
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
      is_admin: { Args: never; Returns: boolean }
      is_responsavel: { Args: never; Returns: boolean }
      is_vistoriador: { Args: never; Returns: boolean }
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
// Table: formularios_espelho_danos
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
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
// Table: historico_chamado
//   id: uuid (not null, default: gen_random_uuid())
//   chamado_id: uuid (not null)
//   acao: text (not null)
//   usuario_id: uuid (not null)
//   detalhes: text (nullable)
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
//   CHECK anexos_chamado_tipo_arquivo_check: CHECK ((tipo_arquivo = ANY (ARRAY['audio'::text, 'video'::text, 'imagem'::text, 'pdf'::text])))
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
//   CHECK chamados_status_check: CHECK ((status = ANY (ARRAY['aberto'::text, 'em_atendimento'::text, 'finalizado'::text])))
//   FOREIGN KEY chamados_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: documentos
//   FOREIGN KEY documentos_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE SET NULL
//   PRIMARY KEY documentos_pkey: PRIMARY KEY (id)
//   CHECK documentos_tipo_documento_check: CHECK ((tipo_documento = ANY (ARRAY['IDO'::text, 'Espelho de Danos'::text, 'Vistoria'::text])))
// Table: formularios_espelho_danos
//   FOREIGN KEY formularios_espelho_danos_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY formularios_espelho_danos_pkey: PRIMARY KEY (id)
// Table: formularios_ido
//   FOREIGN KEY formularios_ido_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY formularios_ido_pkey: PRIMARY KEY (id)
// Table: historico_chamado
//   CHECK historico_chamado_acao_check: CHECK ((acao = ANY (ARRAY['criado'::text, 'atribuido'::text, 'respondido'::text, 'finalizado'::text, 'deletado'::text, 'transferido'::text, 'reaberto'::text])))
//   FOREIGN KEY historico_chamado_chamado_id_fkey: FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
//   PRIMARY KEY historico_chamado_pkey: PRIMARY KEY (id)
//   FOREIGN KEY historico_chamado_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: perfil_usuario
//   FOREIGN KEY perfil_usuario_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY perfil_usuario_pkey: PRIMARY KEY (id)
//   CHECK perfil_usuario_tipo_usuario_check: CHECK ((tipo_usuario = ANY (ARRAY['basico'::text, 'responsavel'::text, 'admin'::text, 'vistoriador'::text])))
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
//     USING: ((usuario_id = auth.uid()) AND (is_responsavel() OR is_admin()))
//   Policy "anexos_internos_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_responsavel() OR is_admin())
//   Policy "anexos_internos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (is_responsavel() OR is_admin())
//   Policy "anexos_internos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) AND (is_responsavel() OR is_admin()))
// Table: auditoria_admin
//   Policy "admin_auditoria_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin()
//   Policy "admin_auditoria_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
// Table: chamados
//   Policy "chamados_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (usuario_id = auth.uid())
//   Policy "chamados_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_responsavel() OR is_admin())
//   Policy "chamados_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR (is_responsavel() AND ((responsavel_id = auth.uid()) OR (status = 'aberto'::text))) OR is_admin())
// Table: documentos
//   Policy "documentos_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_admin() OR is_responsavel())
//   Policy "documentos_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "documentos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "documentos_select_public_os" (SELECT, PERMISSIVE) roles={public}
//     USING: ((tipo_documento = ANY (ARRAY['Vistoria'::text, 'Espelho de Danos'::text])) AND (numero_os IS NOT NULL) AND (numero_os <> ''::text))
//   Policy "documentos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_vistoriador())
//     WITH CHECK: ((chamado_id IS NULL) OR (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.responsavel_id = auth.uid()) OR (chamados.usuario_id = auth.uid())))) OR is_admin() OR is_responsavel() OR is_vistoriador())
// Table: formularios_espelho_danos
//   Policy "formularios_espelho_danos_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "formularios_espelho_danos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin())
//   Policy "formularios_espelho_danos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid())))
//     WITH CHECK: (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid())))
// Table: formularios_ido
//   Policy "formularios_ido_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "formularios_ido_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE ((chamados.usuario_id = auth.uid()) OR (chamados.responsavel_id = auth.uid())))) OR is_admin())
//   Policy "formularios_ido_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid())))
//     WITH CHECK: (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.responsavel_id = auth.uid())))
// Table: historico_chamado
//   Policy "Permitir INSERT para responsáveis e admin" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() IS NOT NULL)
//   Policy "Permitir SELECT para admin e responsáveis" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((( SELECT perfil_usuario.tipo_usuario    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())) = 'admin'::text) OR (( SELECT perfil_usuario.tipo_usuario    FROM perfil_usuario   WHERE (perfil_usuario.id = auth.uid())) = 'responsavel'::text) OR (chamado_id IN ( SELECT chamados.id    FROM chamados   WHERE (chamados.usuario_id = auth.uid()))))
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
// Table: documentos
//   update_documentos_atualizado_em_trigger: CREATE TRIGGER update_documentos_atualizado_em_trigger BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION update_documentos_atualizado_em()

// --- INDEXES ---
// Table: documentos
//   CREATE INDEX documentos_chamado_id_idx ON public.documentos USING btree (chamado_id)
//   CREATE INDEX documentos_registro_responsavel_idx ON public.documentos USING btree (registro_responsavel)
//   CREATE INDEX documentos_tipo_documento_idx ON public.documentos USING btree (tipo_documento)
// Table: formularios_espelho_danos
//   CREATE INDEX formularios_espelho_danos_chamado_id_idx ON public.formularios_espelho_danos USING btree (chamado_id)
// Table: formularios_ido
//   CREATE INDEX formularios_ido_chamado_id_idx ON public.formularios_ido USING btree (chamado_id)
