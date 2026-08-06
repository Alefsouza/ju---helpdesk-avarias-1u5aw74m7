-- Modify trg_notify_new_anexo_interno to detect orçamento files
-- and notify sinistro/juridico users specifically.
-- Non-orçamento attachments preserve the existing owner/responsible notification behavior.

CREATE OR REPLACE FUNCTION public.trg_notify_new_anexo_interno()
RETURNS trigger AS $$
DECLARE
    v_chamado_id UUID := NEW.chamado_id;
    v_dono_id UUID;
    v_resp_id UUID;
    v_autor_id UUID := NEW.usuario_id;
    v_short_id TEXT;
    v_chamado_titulo TEXT;
    v_is_orcamento BOOLEAN;
    v_target_user UUID;
BEGIN
    SELECT usuario_id, responsavel_id, titulo INTO v_dono_id, v_resp_id, v_chamado_titulo
    FROM public.chamados WHERE id = v_chamado_id;
    v_short_id := UPPER(SPLIT_PART(v_chamado_id::text, '-', 1));

    v_is_orcamento := (
        NEW.nome_arquivo ILIKE '%orçamento%' OR
        NEW.nome_arquivo ILIKE '%orcamento%'
    );

    IF v_is_orcamento THEN
        -- Notify all active sinistro/juridico users (except the author)
        FOR v_target_user IN
            SELECT id FROM public.perfil_usuario
            WHERE ativo = true
              AND tipo_usuario IN ('sinistro', 'juridico')
              AND id != v_autor_id
        LOOP
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (
                v_target_user,
                'Novo Orçamento',
                'Um orçamento foi anexo ao chamado ' || COALESCE(v_chamado_titulo, ''),
                '/dashboard/chamados/' || v_chamado_id
            );
        END LOOP;
    ELSE
        -- Preserve existing behavior: notify owner and responsible
        IF v_autor_id != v_dono_id THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (
                v_dono_id,
                'Novo Anexo Interno #' || v_short_id,
                'Um anexo interno foi adicionado.',
                '/dashboard/chamados/' || v_chamado_id
            );
        END IF;

        IF v_resp_id IS NOT NULL AND v_autor_id != v_resp_id THEN
            INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, link)
            VALUES (
                v_resp_id,
                'Novo Anexo Interno #' || v_short_id,
                'Um anexo interno foi adicionado.',
                '/dashboard/chamados/' || v_chamado_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_anexo_interno_notify ON public.anexos_chamado_interno;
CREATE TRIGGER on_new_anexo_interno_notify
AFTER INSERT ON public.anexos_chamado_interno
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_anexo_interno();
