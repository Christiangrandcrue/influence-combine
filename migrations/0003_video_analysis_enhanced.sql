-- Enhanced video analysis fields
ALTER TABLE videos ADD COLUMN prediction_current TEXT;
ALTER TABLE videos ADD COLUMN prediction_improved TEXT;
ALTER TABLE videos ADD COLUMN analysis_verdict TEXT;
ALTER TABLE videos ADD COLUMN reanalysis_count INTEGER DEFAULT 0;
