-- Enable all automation rules with auto mode
UPDATE automation_rules 
SET enabled = true, mode = 'auto', updated_at = now()
WHERE rule_type IN ('budget_depletion', 'spend_spike', 'st_harvest', 'st_prune');