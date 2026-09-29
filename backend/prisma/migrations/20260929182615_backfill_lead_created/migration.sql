-- Leads criados antes do histórico ganham o evento "Criado", com a data real de criação e a
-- origem como texto. A etapa de criação não é conhecida (o lead pode ter mudado de coluna),
-- então fica sem "to_stage".
INSERT INTO "lead_activities" ("id", "lead_id", "type", "text", "created_at")
SELECT gen_random_uuid()::text, l."id", 'CREATED', l."source", l."created_at"
FROM "leads" l
WHERE NOT EXISTS (SELECT 1 FROM "lead_activities" a WHERE a."lead_id" = l."id");
