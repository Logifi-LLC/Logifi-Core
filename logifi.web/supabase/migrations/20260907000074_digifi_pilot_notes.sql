-- Add Digifi pilot notes for personalized scanning context
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS digifi_pilot_notes TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS digifi_pilot_notes_priors JSONB;

COMMENT ON COLUMN user_profiles.digifi_pilot_notes IS 'User-entered flying context/bio for Digifi personalization (schools, bases, aircraft types, eras)';
COMMENT ON COLUMN user_profiles.digifi_pilot_notes_priors IS 'Extracted structured priors from pilot notes: {schools: string[], bases: string[], aircraft: string[], eras: string[]}';
