ALTER TABLE public.messages
  ADD COLUMN optimized_content text,
  ADD COLUMN model_recommended text,
  ADD COLUMN task_type text,
  ADD COLUMN optimization_savings_eur numeric;