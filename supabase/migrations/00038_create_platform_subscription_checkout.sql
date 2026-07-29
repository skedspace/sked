-- Platform-owned PayMongo checkout ledger. This is intentionally separate
-- from organization customer booking payments.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_term_months INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_current_per_org
  ON subscriptions(org_id)
  WHERE status IN ('active', 'past_due');

CREATE TABLE platform_subscription_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  billing_term_months INTEGER NOT NULL CHECK (billing_term_months IN (1, 12, 24, 36)),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'canceled')),
  paymongo_checkout_session_id TEXT UNIQUE,
  paymongo_payment_id TEXT UNIQUE,
  checkout_url TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_checkouts_org_created
  ON platform_subscription_checkouts(org_id, created_at DESC);

CREATE TABLE platform_subscription_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'ignored', 'failed')),
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE subscription_invoices
  ADD COLUMN IF NOT EXISTS checkout_id UUID REFERENCES platform_subscription_checkouts(id),
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_ref TEXT UNIQUE;

ALTER TABLE platform_subscription_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscription_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY owners_can_view_platform_checkouts
  ON platform_subscription_checkouts FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Only server-side service-role code creates or mutates checkout/webhook rows.

CREATE OR REPLACE FUNCTION activate_platform_subscription(
  p_checkout_id UUID,
  p_payment_id TEXT,
  p_paid_at TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkout platform_subscription_checkouts%ROWTYPE;
  v_subscription_id UUID;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_checkout
  FROM platform_subscription_checkouts
  WHERE id = p_checkout_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Checkout not found';
  END IF;

  IF v_checkout.status = 'paid' THEN
    SELECT id INTO v_subscription_id
    FROM subscriptions WHERE org_id = v_checkout.org_id AND status = 'active'
    ORDER BY current_period_end DESC LIMIT 1;
    RETURN v_subscription_id;
  END IF;

  v_period_start := GREATEST(
    now(),
    COALESCE((
      SELECT current_period_end FROM subscriptions
      WHERE org_id = v_checkout.org_id AND status = 'active'
      ORDER BY current_period_end DESC LIMIT 1
    ), now())
  );
  v_period_end := v_period_start + make_interval(months => v_checkout.billing_term_months);

  UPDATE subscriptions SET status = 'expired', updated_at = now()
  WHERE org_id = v_checkout.org_id AND status IN ('active', 'past_due');

  INSERT INTO subscriptions (
    org_id, plan, status, billing_term_months, auto_renew,
    current_period_start, current_period_end
  ) VALUES (
    v_checkout.org_id, 'monthly', 'active', v_checkout.billing_term_months,
    v_checkout.billing_term_months = 1, v_period_start, v_period_end
  ) RETURNING id INTO v_subscription_id;

  UPDATE organizations SET plan = 'premium' WHERE id = v_checkout.org_id;

  UPDATE platform_subscription_checkouts
  SET status = 'paid', paymongo_payment_id = p_payment_id,
      paid_at = p_paid_at, updated_at = now()
  WHERE id = p_checkout_id;

  INSERT INTO payments (
    org_id, provider, provider_ref, type, category, amount_cents,
    status, payment_method, description
  ) VALUES (
    v_checkout.org_id, 'paymongo', p_payment_id, 'full', 'subscription',
    v_checkout.amount_cents, 'succeeded', 'paymongo_checkout',
    'SKED Premium platform subscription'
  ) ON CONFLICT (provider_ref) DO NOTHING;

  INSERT INTO subscription_invoices (
    subscription_id, checkout_id, invoice_number, provider, provider_ref,
    amount_cents, status, period_start, period_end, paid_at
  ) VALUES (
    v_subscription_id, v_checkout.id,
    'SKED-' || upper(substr(replace(v_checkout.id::text, '-', ''), 1, 12)),
    'paymongo', p_payment_id, v_checkout.amount_cents, 'paid',
    v_period_start, v_period_end, p_paid_at
  ) ON CONFLICT (provider_ref) DO NOTHING;

  INSERT INTO audit_log (org_id, actor_id, action, target, payload)
  VALUES (
    v_checkout.org_id, v_checkout.user_id, 'subscription.payment_succeeded',
    v_subscription_id::text,
    jsonb_build_object(
      'checkout_id', v_checkout.id,
      'payment_id', p_payment_id,
      'amount_cents', v_checkout.amount_cents,
      'billing_term_months', v_checkout.billing_term_months
    )
  );

  RETURN v_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION activate_platform_subscription(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_platform_subscription(UUID, TEXT, TIMESTAMPTZ) TO service_role;
