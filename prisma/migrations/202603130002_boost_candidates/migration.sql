ALTER TABLE content_items
    ADD COLUMN boost_candidate BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN boost_reason TEXT;
