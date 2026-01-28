-- 1. Application Products
CREATE TABLE public.application_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.certification_applications(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.application_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own products" ON public.application_products
FOR ALL TO authenticated
USING (
    application_id IN (
        SELECT ca.id FROM public.certification_applications ca
        JOIN public.profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
    )
)
WITH CHECK (
    application_id IN (
        SELECT ca.id FROM public.certification_applications ca
        JOIN public.profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Admins can view products" ON public.application_products
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage products" ON public.application_products
FOR ALL TO authenticated
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- 2. Product Ingredients
CREATE TABLE public.product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.application_products(id) ON DELETE CASCADE NOT NULL,
    ingredient_name TEXT NOT NULL,
    percentage DECIMAL(5,2),
    source TEXT,
    is_halal_certified BOOLEAN DEFAULT false,
    supplier_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage own ingredients" ON public.product_ingredients
FOR ALL TO authenticated
USING (
    product_id IN (
        SELECT ap.id FROM public.application_products ap
        JOIN public.certification_applications ca ON ca.id = ap.application_id
        JOIN public.profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
    )
)
WITH CHECK (
    product_id IN (
        SELECT ap.id FROM public.application_products ap
        JOIN public.certification_applications ca ON ca.id = ap.application_id
        JOIN public.profiles p ON p.organization_id = ca.organization_id
        WHERE p.id = auth.uid()
    )
);

CREATE POLICY "Admins can view ingredients" ON public.product_ingredients
FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage ingredients" ON public.product_ingredients
FOR ALL TO authenticated
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- 3. Support Tickets
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    resolved_at TIMESTAMPTZ
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.support_tickets
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "Users can create tickets" ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tickets" ON public.support_tickets
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

-- 4. Ticket Messages
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
FOR SELECT TO authenticated
USING (
    ticket_id IN (
        SELECT id FROM public.support_tickets
        WHERE user_id = auth.uid() OR is_admin_user(auth.uid())
    )
);

CREATE POLICY "Users can send messages" ON public.ticket_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- 5. FAQ Items
CREATE TABLE public.faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active FAQs" ON public.faq_items
FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage FAQs" ON public.faq_items
FOR ALL TO authenticated
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- 6. Chat Sessions
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_at TIMESTAMPTZ
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.chat_sessions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "Users can create sessions" ON public.chat_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions" ON public.chat_sessions
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

-- 7. Chat Messages
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat messages" ON public.chat_messages
FOR SELECT TO authenticated
USING (
    session_id IN (
        SELECT id FROM public.chat_sessions
        WHERE user_id = auth.uid() OR is_admin_user(auth.uid())
    )
);

CREATE POLICY "Users can send chat messages" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
  _ticket_num TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 10) AS INTEGER)), 0) + 1
  INTO _seq
  FROM public.support_tickets
  WHERE ticket_number LIKE 'TKT-' || _year || '-%';
  
  _ticket_num := 'TKT-' || _year || '-' || LPAD(_seq::TEXT, 5, '0');
  RETURN _ticket_num;
END;
$$;