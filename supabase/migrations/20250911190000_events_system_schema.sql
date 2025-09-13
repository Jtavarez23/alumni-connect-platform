-- ===========================================
-- EVENTS SYSTEM SCHEMA
-- Complete events, ticketing, and RSVP system for Alumni Connect
-- ===========================================

-- ===========================================
-- CORE EVENTS TABLES
-- ===========================================

-- Events table
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_type TEXT NOT NULL CHECK (host_type IN ('school', 'group', 'user')),
    host_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    location TEXT,
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'alumni_only', 'school_only', 'connections_only', 'private')),
    ticketing_enabled BOOLEAN NOT NULL DEFAULT false,
    max_capacity INTEGER,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event tickets/pricing tiers
CREATE TABLE public.event_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    quantity INTEGER, -- NULL = unlimited
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    sales_start TIMESTAMP WITH TIME ZONE,
    sales_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event orders/purchases
CREATE TABLE public.event_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    purchaser_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES public.event_tickets(id) ON DELETE SET NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    stripe_payment_intent TEXT,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'refunded', 'canceled')),
    attendee_emails JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendees/RSVPs
CREATE TABLE public.event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.event_orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'no_show')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Event roles (hosts, co-hosts, organizers, moderators)
CREATE TABLE public.event_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('host', 'cohost', 'organizer', 'moderator')),
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id, role)
);

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

-- Events indexes
CREATE INDEX idx_events_host ON public.events(host_type, host_id);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_events_visibility ON public.events(visibility);
CREATE INDEX idx_events_location ON public.events(location) WHERE location IS NOT NULL;
CREATE INDEX idx_events_virtual ON public.events(is_virtual);

-- Event tickets indexes
CREATE INDEX idx_event_tickets_event ON public.event_tickets(event_id);
CREATE INDEX idx_event_tickets_sales ON public.event_tickets(sales_start, sales_end);

-- Event orders indexes
CREATE INDEX idx_event_orders_event ON public.event_orders(event_id);
CREATE INDEX idx_event_orders_purchaser ON public.event_orders(purchaser_id);
CREATE INDEX idx_event_orders_status ON public.event_orders(status);
CREATE INDEX idx_event_orders_created ON public.event_orders(created_at DESC);

-- Event attendees indexes
CREATE INDEX idx_event_attendees_event ON public.event_attendees(event_id, status);
CREATE INDEX idx_event_attendees_user ON public.event_attendees(user_id);
CREATE INDEX idx_event_attendees_registered ON public.event_attendees(registered_at);

-- Event roles indexes
CREATE INDEX idx_event_roles_event ON public.event_roles(event_id, role);
CREATE INDEX idx_event_roles_user ON public.event_roles(user_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all events tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_roles ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view public events" ON public.events FOR SELECT USING (
    visibility = 'public' OR
    (visibility = 'alumni_only' AND auth.uid() IN (SELECT id FROM public.profiles)) OR
    (visibility = 'school_only' AND host_id IN (
        SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )) OR
    created_by = auth.uid() OR
    auth.uid() IN (SELECT user_id FROM public.event_roles WHERE event_id = id)
);

CREATE POLICY "Event creators can update their events" ON public.events FOR UPDATE USING (
    created_by = auth.uid() OR
    auth.uid() IN (SELECT user_id FROM public.event_roles WHERE event_id = id AND role IN ('host', 'organizer'))
);

CREATE POLICY "Users can create events" ON public.events FOR INSERT WITH CHECK (created_by = auth.uid());

-- Event tickets policies  
CREATE POLICY "Users can view event tickets for visible events" ON public.event_tickets FOR SELECT USING (
    event_id IN (SELECT id FROM public.events)
);

-- Event orders policies
CREATE POLICY "Users can view their own orders" ON public.event_orders FOR SELECT USING (purchaser_id = auth.uid());
CREATE POLICY "Users can create orders" ON public.event_orders FOR INSERT WITH CHECK (purchaser_id = auth.uid());

-- Event attendees policies
CREATE POLICY "Users can view attendees for events they can see" ON public.event_attendees FOR SELECT USING (
    event_id IN (SELECT id FROM public.events) AND
    (event_id IN (SELECT id FROM public.events WHERE visibility = 'public') OR user_id = auth.uid())
);

CREATE POLICY "Users can register for events" ON public.event_attendees FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own attendance" ON public.event_attendees FOR UPDATE USING (user_id = auth.uid());

-- Event roles policies
CREATE POLICY "Users can view event roles for visible events" ON public.event_roles FOR SELECT USING (
    event_id IN (SELECT id FROM public.events)
);

CREATE POLICY "Event hosts can manage roles" ON public.event_roles FOR ALL USING (
    event_id IN (SELECT id FROM public.events WHERE created_by = auth.uid()) OR
    auth.uid() IN (SELECT user_id FROM public.event_roles er WHERE er.event_id = event_id AND role IN ('host', 'organizer'))
);

-- ===========================================
-- SCHEMA COMPLETION
-- ===========================================

SELECT 'Events system schema created successfully! 🎉' as status;