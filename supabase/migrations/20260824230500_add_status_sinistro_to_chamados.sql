-- Migration: Add status_sinistro to chamados table
ALTER TABLE public.chamados
ADD COLUMN IF NOT EXISTS status_sinistro text;
