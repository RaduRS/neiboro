-- Check current clusters and their postcodes
SELECT id, postcode, area_name, created_at 
FROM clusters 
ORDER BY created_at;

-- If Great Northern cluster exists with wrong postcode, update it
UPDATE clusters 
SET postcode = 'NG163PD'
WHERE area_name = 'Great Northern' 
  AND postcode != 'NG163PD';

-- If Great Northern cluster doesn't exist, create it
INSERT INTO clusters (postcode, area_name)
SELECT 'NG163PD', 'Great Northern'
WHERE NOT EXISTS (
  SELECT 1 FROM clusters WHERE area_name = 'Great Northern'
);

-- Verify the result
SELECT id, postcode, area_name, created_at 
FROM clusters 
WHERE area_name = 'Great Northern';