-- A migração real_pipeline_stages criou as etapas Respondeu, Reunião marcada e Perdido com
-- md5(...)::uuid, que não é UUID v4: a API (IsUUID('4') / ParseUUIDPipe) recusava mover leads
-- para elas, renomear ou excluir. Troca esses ids por UUID v4; leads.stage_id acompanha
-- (ON UPDATE CASCADE).
UPDATE "stages"
SET "id" = gen_random_uuid()::text
WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
