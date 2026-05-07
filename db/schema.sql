CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  address TEXT,
  postcode TEXT,
  town TEXT,
  lat REAL,
  lng REAL,
  built_year INTEGER,
  lot_size_sqft INTEGER,
  satellite_image_url TEXT,
  rendered_image_url TEXT,
  has_pool INTEGER DEFAULT 0,
  filter_passed INTEGER DEFAULT 0,
  owner_name TEXT,
  estate_agent TEXT,
  property_value REAL,
  pool_build_cost REAL,
  home_value_lift REAL,
  postcard_pdf_path TEXT,
  microsite_url TEXT,
  status TEXT DEFAULT 'pending',
  current_stage TEXT,
  step_number INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  event_type TEXT,
  title TEXT,
  subtitle TEXT,
  icon TEXT,
  occurred_at TEXT
);
