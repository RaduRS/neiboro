-- Check current post_responses table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'post_responses' 
ORDER BY ordinal_position;

-- Check constraints on post_responses table
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'post_responses';

-- Check unique constraints specifically
SELECT 
    tc.constraint_name, 
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'post_responses' 
    AND tc.constraint_type = 'UNIQUE';