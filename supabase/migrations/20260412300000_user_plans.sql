CREATE TABLE public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id)
    ON DELETE CASCADE UNIQUE,
  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text DEFAULT 'inactive',
  current_period_end timestamptz,
  sequence_credits_remaining integer NOT NULL DEFAULT 0,
  sequence_credits_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_plans_select_own"
  ON public.user_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_plans_insert_own"
  ON public.user_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_plans_update_own"
  ON public.user_plans FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
