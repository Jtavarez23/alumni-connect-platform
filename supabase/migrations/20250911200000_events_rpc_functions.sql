-- ===========================================
-- EVENTS SYSTEM RPC FUNCTIONS
-- Event management, RSVP, and ticketing functions
-- ===========================================

-- ===========================================
-- EVENT CREATION AND MANAGEMENT
-- ===========================================

-- Create a new event
CREATE OR REPLACE FUNCTION public.create_event(
    p_title TEXT,
    p_starts_at TIMESTAMP WITH TIME ZONE,
    p_description TEXT DEFAULT NULL,
    p_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_is_virtual BOOLEAN DEFAULT false,
    p_visibility TEXT DEFAULT 'public',
    p_ticketing_enabled BOOLEAN DEFAULT false,
    p_max_capacity INTEGER DEFAULT NULL,
    p_host_type TEXT DEFAULT 'user',
    p_host_id UUID DEFAULT NULL,
    p_tickets JSONB DEFAULT '[]'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_event_id UUID;
    ticket_item JSONB;
    result JSON;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('error', 'Authentication required');
    END IF;

    -- Set default host_id to current user if not provided
    IF p_host_id IS NULL THEN
        p_host_id := auth.uid();
    END IF;

    -- Create the event
    INSERT INTO public.events (
        host_type, host_id, title, description, starts_at, ends_at,
        location, is_virtual, visibility, ticketing_enabled, max_capacity, created_by
    ) VALUES (
        p_host_type, p_host_id, p_title, p_description, p_starts_at, p_ends_at,
        p_location, p_is_virtual, p_visibility, p_ticketing_enabled, p_max_capacity, auth.uid()
    ) RETURNING id INTO new_event_id;

    -- Add creator as host role
    INSERT INTO public.event_roles (event_id, user_id, role, assigned_by)
    VALUES (new_event_id, auth.uid(), 'host', auth.uid());

    -- Create tickets if provided
    IF p_tickets IS NOT NULL AND jsonb_array_length(p_tickets) > 0 THEN
        FOR ticket_item IN SELECT * FROM jsonb_array_elements(p_tickets)
        LOOP
            INSERT INTO public.event_tickets (
                event_id, name, price_cents, currency, quantity, sales_start, sales_end
            ) VALUES (
                new_event_id,
                COALESCE(ticket_item->>'name', 'General Admission'),
                COALESCE((ticket_item->>'price_cents')::INTEGER, 0),
                COALESCE(ticket_item->>'currency', 'USD'),
                CASE WHEN ticket_item->>'quantity' IS NOT NULL THEN (ticket_item->>'quantity')::INTEGER ELSE NULL END,
                CASE WHEN ticket_item->>'sales_start' IS NOT NULL THEN (ticket_item->>'sales_start')::TIMESTAMP WITH TIME ZONE ELSE NULL END,
                CASE WHEN ticket_item->>'sales_end' IS NOT NULL THEN (ticket_item->>'sales_end')::TIMESTAMP WITH TIME ZONE ELSE NULL END
            );
        END LOOP;
    END IF;

    -- Return success with event ID
    result := json_build_object(
        'success', true,
        'event_id', new_event_id,
        'message', 'Event created successfully'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Update an event
CREATE OR REPLACE FUNCTION public.update_event(
    p_event_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_is_virtual BOOLEAN DEFAULT NULL,
    p_visibility TEXT DEFAULT NULL,
    p_max_capacity INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('error', 'Authentication required');
    END IF;

    -- Check if user has permission to update this event
    IF NOT EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = p_event_id 
        AND (e.created_by = auth.uid() OR 
             auth.uid() IN (SELECT user_id FROM public.event_roles WHERE event_id = p_event_id AND role IN ('host', 'organizer')))
    ) THEN
        RETURN json_build_object('error', 'Permission denied');
    END IF;

    -- Update the event with provided values
    UPDATE public.events SET
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        starts_at = COALESCE(p_starts_at, starts_at),
        ends_at = COALESCE(p_ends_at, ends_at),
        location = COALESCE(p_location, location),
        is_virtual = COALESCE(p_is_virtual, is_virtual),
        visibility = COALESCE(p_visibility, visibility),
        max_capacity = COALESCE(p_max_capacity, max_capacity),
        updated_at = NOW()
    WHERE id = p_event_id;

    result := json_build_object(
        'success', true,
        'message', 'Event updated successfully'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- ===========================================
-- EVENT RSVP AND ATTENDANCE
-- ===========================================

-- RSVP to an event
CREATE OR REPLACE FUNCTION public.rsvp_to_event(
    p_event_id UUID,
    p_action TEXT DEFAULT 'register' -- 'register' or 'unregister'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_capacity INTEGER;
    current_attendees INTEGER;
    result JSON;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('error', 'Authentication required');
    END IF;

    -- Check if event exists and is visible to user
    IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN
        RETURN json_build_object('error', 'Event not found');
    END IF;

    -- Get event capacity
    SELECT max_capacity INTO event_capacity 
    FROM public.events 
    WHERE id = p_event_id;

    -- Get current attendee count
    SELECT COUNT(*) INTO current_attendees
    FROM public.event_attendees
    WHERE event_id = p_event_id AND status IN ('registered', 'attended');

    IF p_action = 'register' THEN
        -- Check capacity if event has one
        IF event_capacity IS NOT NULL AND current_attendees >= event_capacity THEN
            RETURN json_build_object('error', 'Event is at full capacity');
        END IF;

        -- Register user (upsert)
        INSERT INTO public.event_attendees (event_id, user_id, status)
        VALUES (p_event_id, auth.uid(), 'registered')
        ON CONFLICT (event_id, user_id) 
        DO UPDATE SET 
            status = 'registered',
            registered_at = NOW();

        result := json_build_object(
            'success', true,
            'action', 'registered',
            'message', 'Successfully registered for event'
        );

    ELSIF p_action = 'unregister' THEN
        -- Unregister user
        DELETE FROM public.event_attendees
        WHERE event_id = p_event_id AND user_id = auth.uid();

        result := json_build_object(
            'success', true,
            'action', 'unregistered',
            'message', 'Successfully unregistered from event'
        );

    ELSE
        RETURN json_build_object('error', 'Invalid action. Use "register" or "unregister"');
    END IF;

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Get user's RSVP status for an event
CREATE OR REPLACE FUNCTION public.get_user_event_rsvp(
    p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attendee_status TEXT;
    result JSON;
BEGIN
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('error', 'Authentication required');
    END IF;

    -- Get user's attendance status
    SELECT status INTO attendee_status
    FROM public.event_attendees
    WHERE event_id = p_event_id AND user_id = auth.uid();

    result := json_build_object(
        'event_id', p_event_id,
        'user_id', auth.uid(),
        'rsvp_status', COALESCE(attendee_status, 'not_registered'),
        'is_attending', CASE WHEN attendee_status IN ('registered', 'attended') THEN true ELSE false END
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- ===========================================
-- EVENT DISCOVERY AND SEARCH
-- ===========================================

-- Search and filter events
CREATE OR REPLACE FUNCTION public.search_events(
    p_school_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_is_virtual BOOLEAN DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    events_data JSON;
    total_count INTEGER;
    result JSON;
BEGIN
    -- Build dynamic query for events with filters
    WITH filtered_events AS (
        SELECT 
            e.id,
            e.host_type,
            e.host_id,
            e.title,
            e.description,
            e.starts_at,
            e.ends_at,
            e.location,
            e.is_virtual,
            e.visibility,
            e.ticketing_enabled,
            e.max_capacity,
            e.created_at,
            CASE 
                WHEN e.host_type = 'school' THEN s.name
                WHEN e.host_type = 'user' THEN p.first_name || ' ' || COALESCE(p.last_name, '')
                ELSE 'Unknown Host'
            END as host_name,
            COALESCE(s.name, host_school.name) as school_name,
            (SELECT COUNT(*) FROM public.event_attendees ea WHERE ea.event_id = e.id AND ea.status IN ('registered', 'attended')) as attendee_count,
            CASE WHEN auth.uid() IS NOT NULL THEN
                EXISTS(SELECT 1 FROM public.event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid() AND ea.status IN ('registered', 'attended'))
            ELSE false END as is_attending
        FROM public.events e
        LEFT JOIN public.schools s ON e.host_type = 'school' AND e.host_id = s.id
        LEFT JOIN public.profiles p ON e.host_type = 'user' AND e.host_id = p.id
        LEFT JOIN public.schools host_school ON e.host_type = 'user' AND p.school_id = host_school.id
        WHERE 
            -- Visibility filtering
            (e.visibility = 'public' OR 
             (e.visibility = 'alumni_only' AND auth.uid() IS NOT NULL) OR
             (auth.uid() = e.created_by))
            -- School filter
            AND (p_school_id IS NULL OR 
                 (e.host_type = 'school' AND e.host_id = p_school_id) OR
                 (e.host_type = 'user' AND p.school_id = (SELECT school_id FROM public.profiles WHERE id = e.host_id)))
            -- Date filters
            AND (p_start_date IS NULL OR e.starts_at >= p_start_date)
            AND (p_end_date IS NULL OR e.starts_at <= p_end_date)
            -- Location filter
            AND (p_location IS NULL OR e.location ILIKE '%' || p_location || '%')
            -- Virtual filter
            AND (p_is_virtual IS NULL OR e.is_virtual = p_is_virtual)
            -- Search query
            AND (p_search_query IS NULL OR 
                 e.title ILIKE '%' || p_search_query || '%' OR 
                 e.description ILIKE '%' || p_search_query || '%' OR
                 e.location ILIKE '%' || p_search_query || '%')
        ORDER BY e.starts_at ASC
    )
    SELECT 
        json_agg(row_to_json(fe)) as events,
        (SELECT COUNT(*) FROM filtered_events) as total
    INTO events_data, total_count
    FROM (
        SELECT * FROM filtered_events 
        LIMIT p_limit OFFSET p_offset
    ) fe;

    result := json_build_object(
        'events', COALESCE(events_data, '[]'::json),
        'total_count', COALESCE(total_count, 0),
        'has_more', COALESCE(total_count, 0) > (p_offset + p_limit)
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Get event details with full information
CREATE OR REPLACE FUNCTION public.get_event_details(
    p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_data JSON;
    tickets_data JSON;
    attendees_data JSON;
    result JSON;
BEGIN
    -- Get main event data
    SELECT row_to_json(event_info) INTO event_data
    FROM (
        SELECT 
            e.id,
            e.host_type,
            e.host_id,
            e.title,
            e.description,
            e.starts_at,
            e.ends_at,
            e.location,
            e.is_virtual,
            e.visibility,
            e.ticketing_enabled,
            e.max_capacity,
            e.created_at,
            e.updated_at,
            CASE 
                WHEN e.host_type = 'school' THEN s.name
                WHEN e.host_type = 'user' THEN p.first_name || ' ' || COALESCE(p.last_name, '')
                ELSE 'Unknown Host'
            END as host_name,
            CASE 
                WHEN e.host_type = 'school' THEN s.slug
                WHEN e.host_type = 'user' THEN host_school.name
                ELSE NULL
            END as school_name,
            (SELECT COUNT(*) FROM public.event_attendees ea WHERE ea.event_id = e.id AND ea.status IN ('registered', 'attended')) as attendee_count,
            CASE WHEN auth.uid() IS NOT NULL THEN
                EXISTS(SELECT 1 FROM public.event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid() AND ea.status IN ('registered', 'attended'))
            ELSE false END as is_attending
        FROM public.events e
        LEFT JOIN public.schools s ON e.host_type = 'school' AND e.host_id = s.id
        LEFT JOIN public.profiles p ON e.host_type = 'user' AND e.host_id = p.id
        LEFT JOIN public.schools host_school ON e.host_type = 'user' AND p.school_id = host_school.id
        WHERE e.id = p_event_id
    ) event_info;

    -- Return error if event not found
    IF event_data IS NULL THEN
        RETURN json_build_object('error', 'Event not found');
    END IF;

    -- Get tickets data
    SELECT COALESCE(json_agg(row_to_json(ticket_info)), '[]'::json) INTO tickets_data
    FROM (
        SELECT 
            id,
            name,
            price_cents,
            currency,
            quantity,
            quantity_sold,
            sales_start,
            sales_end
        FROM public.event_tickets
        WHERE event_id = p_event_id
        ORDER BY price_cents ASC
    ) ticket_info;

    -- Get sample attendees (first 10)
    SELECT COALESCE(json_agg(row_to_json(attendee_info)), '[]'::json) INTO attendees_data
    FROM (
        SELECT 
            ea.id,
            ea.status,
            ea.registered_at,
            p.first_name || ' ' || COALESCE(p.last_name, '') as display_name,
            p.avatar_url
        FROM public.event_attendees ea
        JOIN public.profiles p ON ea.user_id = p.id
        WHERE ea.event_id = p_event_id AND ea.status IN ('registered', 'attended')
        ORDER BY ea.registered_at DESC
        LIMIT 10
    ) attendee_info;

    result := json_build_object(
        'event', event_data,
        'tickets', tickets_data,
        'sample_attendees', attendees_data
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- ===========================================
-- ANALYTICS AND METRICS
-- ===========================================

-- Get event metrics
CREATE OR REPLACE FUNCTION public.get_event_metrics(
    p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    metrics JSON;
BEGIN
    -- Check if user has permission to view metrics
    IF NOT EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = p_event_id 
        AND (e.created_by = auth.uid() OR 
             auth.uid() IN (SELECT user_id FROM public.event_roles WHERE event_id = p_event_id))
    ) THEN
        RETURN json_build_object('error', 'Permission denied');
    END IF;

    SELECT json_build_object(
        'total_registered', COUNT(*) FILTER (WHERE ea.status = 'registered'),
        'total_attended', COUNT(*) FILTER (WHERE ea.status = 'attended'),
        'total_no_show', COUNT(*) FILTER (WHERE ea.status = 'no_show'),
        'registration_by_day', registration_stats.by_day,
        'capacity_utilization', 
            CASE WHEN e.max_capacity IS NOT NULL THEN
                ROUND((COUNT(*) FILTER (WHERE ea.status IN ('registered', 'attended'))::numeric / e.max_capacity) * 100, 2)
            ELSE NULL END
    ) INTO metrics
    FROM public.events e
    LEFT JOIN public.event_attendees ea ON e.id = ea.event_id
    LEFT JOIN LATERAL (
        SELECT json_agg(daily_stats) as by_day
        FROM (
            SELECT 
                DATE(registered_at) as date,
                COUNT(*) as registrations
            FROM public.event_attendees 
            WHERE event_id = p_event_id
            GROUP BY DATE(registered_at)
            ORDER BY date
        ) daily_stats
    ) registration_stats ON true
    WHERE e.id = p_event_id
    GROUP BY e.id, e.max_capacity, registration_stats.by_day;

    RETURN COALESCE(metrics, json_build_object('error', 'Event not found'));

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- ===========================================
-- RPC FUNCTIONS COMPLETED
-- ===========================================

SELECT 'Events RPC functions created successfully! 🎉' as status;