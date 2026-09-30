-- Shared FlightAware lookup cache and airline fleet-number history.
-- Public flight facts only. No user, logbook, or credential columns.
-- Server reads and writes with the service role. Clients have no access.

SET search_path TO public;

CREATE TABLE public.flight_lookup_cache (
  ident text NOT NULL,
  departure_date date NOT NULL,
  dep_airport text NOT NULL,
  arr_airport text NOT NULL,
  registration text,
  aircraft_type text,
  actual_out timestamptz,
  actual_off timestamptz,
  actual_on timestamptz,
  actual_in timestamptz,
  scheduled_out timestamptz,
  fa_flight_id text,
  source text NOT NULL DEFAULT 'flightaware',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  is_final boolean NOT NULL DEFAULT false,
  CONSTRAINT flight_lookup_cache_pkey
    PRIMARY KEY (ident, departure_date, dep_airport, arr_airport),
  CONSTRAINT flight_lookup_cache_source_chk
    CHECK (source = 'flightaware'),
  CONSTRAINT flight_lookup_cache_ident_chk
    CHECK (char_length(ident) BETWEEN 3 AND 16 AND ident = upper(ident)),
  CONSTRAINT flight_lookup_cache_dep_chk
    CHECK (char_length(dep_airport) BETWEEN 3 AND 4 AND dep_airport = upper(dep_airport)),
  CONSTRAINT flight_lookup_cache_arr_chk
    CHECK (char_length(arr_airport) BETWEEN 3 AND 4 AND arr_airport = upper(arr_airport))
);

COMMENT ON TABLE public.flight_lookup_cache IS
  'FlightAware actuals keyed by matched ICAO ident, local departure date, and city pair. Public flight data only.';

CREATE TABLE public.airline_fleet_tails (
  airline_icao text NOT NULL,
  fleet_number text NOT NULL,
  registration text NOT NULL,
  aircraft_type text,
  first_seen_date date NOT NULL,
  last_seen_date date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT airline_fleet_tails_pkey
    PRIMARY KEY (airline_icao, fleet_number, registration),
  CONSTRAINT airline_fleet_tails_dates_chk
    CHECK (first_seen_date <= last_seen_date),
  CONSTRAINT airline_fleet_tails_airline_chk
    CHECK (char_length(airline_icao) BETWEEN 2 AND 3 AND airline_icao = upper(airline_icao)),
  CONSTRAINT airline_fleet_tails_fleet_chk
    CHECK (char_length(fleet_number) BETWEEN 1 AND 8 AND fleet_number = upper(fleet_number)),
  CONSTRAINT airline_fleet_tails_registration_chk
    CHECK (char_length(registration) BETWEEN 2 AND 10 AND registration = upper(registration))
);

COMMENT ON TABLE public.airline_fleet_tails IS
  'Fleet number to registration, with a date range per assignment. A re-registration is a new row. Public flight data only.';

CREATE TRIGGER update_airline_fleet_tails_updated_at
  BEFORE UPDATE ON public.airline_fleet_tails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.flight_lookup_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airline_fleet_tails ENABLE ROW LEVEL SECURITY;

-- Deny client roles explicitly so "RLS enabled, no policy" does not linger.
CREATE POLICY "no client access"
  ON public.flight_lookup_cache
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "no client access"
  ON public.airline_fleet_tails
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.flight_lookup_cache FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.airline_fleet_tails FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.flight_lookup_cache TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.airline_fleet_tails TO service_role;
