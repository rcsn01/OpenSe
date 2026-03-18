CREATE TABLE IF NOT EXISTS logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    text NOT NULL,        
  description   text,                 
  status        text DEFAULT 'success',
  created_at    timestamp DEFAULT now(),
  error_message text,
  metadata      jsonb                 
);
CREATE OR REPLACE FUNCTION log_event(
    p_event_type    text,
    p_description   text DEFAULT NULL,
    p_status        text DEFAULT 'success',
    p_error_message text DEFAULT NULL,
    p_metadata      jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO logs (
        event_type,
        description,
        status,
        error_message,
        metadata
    )
    VALUES (
        p_event_type,
        p_description,
        p_status,
        p_error_message,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;


