-- Safe migration for post_responses table
-- This script updates the schema step by step to avoid conflicts

-- Step 1: Add new columns if they don't exist
DO $$
BEGIN
    -- Add response_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'post_responses' AND column_name = 'response_type') THEN
        ALTER TABLE post_responses 
        ADD COLUMN response_type TEXT NOT NULL DEFAULT 'offer_help';
        
        -- Add check constraint
        ALTER TABLE post_responses 
        ADD CONSTRAINT post_responses_response_type_check 
        CHECK (response_type IN ('offer_help', 'comment'));
    END IF;

    -- Add message column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'post_responses' AND column_name = 'message') THEN
        ALTER TABLE post_responses 
        ADD COLUMN message TEXT;
    END IF;

    -- Add is_read column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'post_responses' AND column_name = 'is_read') THEN
        ALTER TABLE post_responses 
        ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 2: Drop the old unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'post_responses_post_id_user_id_key' 
               AND table_name = 'post_responses') THEN
        ALTER TABLE post_responses DROP CONSTRAINT post_responses_post_id_user_id_key;
    END IF;
END $$;

-- Step 3: Create new unique constraint for help offers only
DROP INDEX IF EXISTS post_responses_unique_help_offer;
CREATE UNIQUE INDEX post_responses_unique_help_offer 
ON post_responses (post_id, user_id) 
WHERE response_type = 'offer_help';

-- Step 4: Remove status column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'post_responses' AND column_name = 'status') THEN
        ALTER TABLE post_responses DROP COLUMN status;
    END IF;
END $$;

-- Step 5: Update any existing data to use the new schema
UPDATE post_responses 
SET response_type = 'offer_help' 
WHERE response_type IS NULL OR response_type = '';

SELECT 'Post responses schema migration completed successfully!' as status;