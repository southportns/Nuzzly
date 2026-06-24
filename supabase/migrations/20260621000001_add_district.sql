-- Migration: Add district column to environment_profiles
ALTER TABLE public.environment_profiles ADD COLUMN IF NOT EXISTS district text;
