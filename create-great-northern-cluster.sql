-- Insert Great Northern cluster with full address details
INSERT INTO clusters (
  postcode,
  area_name,
  city,
  county,
  country
) VALUES (
  'NG163PD',
  'Great Northern',
  'Nottingham',
  'Nottinghamshire',
  'United Kingdom'
);

-- Verify the insertion
SELECT * FROM clusters WHERE postcode = 'NG163PD';