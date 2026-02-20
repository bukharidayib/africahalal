
-- Step 1: Remove all Shariah Review permissions
DELETE FROM workflow_stage_permissions 
WHERE permission_id IN (SELECT id FROM permissions WHERE category = 'Shariah Review');

DELETE FROM role_permissions 
WHERE permission_id IN (SELECT id FROM permissions WHERE category = 'Shariah Review');

DELETE FROM permissions WHERE category = 'Shariah Review';

-- Step 2: Add Finance permissions to CIDO role
-- finance.view
INSERT INTO role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar, permissions p
WHERE ar.name = 'certification_officer' 
  AND p.code = 'finance.view'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ar.id AND rp.permission_id = p.id
  );

-- finance.manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar, permissions p
WHERE ar.name = 'certification_officer' 
  AND p.code = 'finance.manage'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ar.id AND rp.permission_id = p.id
  );

-- Step 3: Add Finance workflow stage permissions at Approved stage for Super Administrator
INSERT INTO workflow_stage_permissions (stage_id, role_id, permission_id)
SELECT ws.id, ar.id, p.id
FROM workflow_stages ws, admin_roles ar, permissions p
WHERE ws.system_code = 'approved'
  AND ar.name = 'super_admin'
  AND p.category = 'Finance'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_stage_permissions wsp
    WHERE wsp.stage_id = ws.id AND wsp.role_id = ar.id AND wsp.permission_id = p.id
  );

-- Step 4: Add Finance workflow stage permissions at Approved stage for CIDO
INSERT INTO workflow_stage_permissions (stage_id, role_id, permission_id)
SELECT ws.id, ar.id, p.id
FROM workflow_stages ws, admin_roles ar, permissions p
WHERE ws.system_code = 'approved'
  AND ar.name = 'certification_officer'
  AND p.code IN ('finance.view', 'finance.manage')
  AND NOT EXISTS (
    SELECT 1 FROM workflow_stage_permissions wsp
    WHERE wsp.stage_id = ws.id AND wsp.role_id = ar.id AND wsp.permission_id = p.id
  );
