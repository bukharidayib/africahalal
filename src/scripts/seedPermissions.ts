
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // MUST use Service Role Key

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PERMISSIONS = [
    // --- Applications Module ---
    { category: 'Applications', code: 'application.view', name: 'View Applications', description: 'View list and details of applications' },
    { category: 'Applications', code: 'application.create', name: 'Create Applications', description: 'Submit new applications on behalf of clients' },
    { category: 'Applications', code: 'application.edit', name: 'Edit Applications', description: 'Edit application details' },
    { category: 'Applications', code: 'application.status.update', name: 'Update Application Status', description: 'Move application between statuses (non-decision)' },
    { category: 'Applications', code: 'application.decision.approve', name: 'Approve Application', description: 'make final certification approval decision' },
    { category: 'Applications', code: 'application.decision.reject', name: 'Reject Application', description: 'Reject certification application' },

    // --- Inspections Module ---
    { category: 'Inspections', code: 'inspection.view', name: 'View Inspections', description: 'View inspection schedules and reports' },
    { category: 'Inspections', code: 'inspection.schedule', name: 'Schedule Inspection', description: 'Assign inspectors and set dates' },
    { category: 'Inspections', code: 'inspection.report.create', name: 'Create Inspection Report', description: 'Submit findings and reports' },
    { category: 'Inspections', code: 'inspection.report.approve', name: 'Approve Inspection Report', description: 'Review and sign off on inspection reports' },

    // --- Certificates Module ---
    { category: 'Certificates', code: 'certificate.view', name: 'View Certificates', description: 'View issued certificates' },
    { category: 'Certificates', code: 'certificate.issue', name: 'Issue Certificate', description: 'Generate and sign new certificates' },
    { category: 'Certificates', code: 'certificate.revoke', name: 'Revoke Certificate', description: 'Revoke or suspend active certificates' },

    // --- Users & Roles (Admin) ---
    { category: 'User Management', code: 'users.view', name: 'View Users', description: 'View admin users and clients' },
    { category: 'User Management', code: 'users.manage', name: 'Manage Users', description: 'Create, edit, suspend users' },
    { category: 'User Management', code: 'roles.manage', name: 'Manage Roles', description: 'Create and edit roles and permissions' },

    // --- Audit & Logs ---
    { category: 'System', code: 'audit.view', name: 'View Audit Logs', description: 'Access system audit trails' },
    { category: 'System', code: 'settings.manage', name: 'Manage System Settings', description: 'Configure global system settings' },
];

async function seedPermissions() {
    console.log('Seeding Permissions...');

    for (const perm of PERMISSIONS) {
        const { error } = await supabase
            .from('permissions')
            .upsert({
                code: perm.code,
                category: perm.category,
                name: perm.name,
                description: perm.description
            }, { onConflict: 'code' });

        if (error) {
            console.error(`Error seeding ${perm.code}:`, error.message);
        } else {
            console.log(`Seeded: ${perm.code}`);
        }
    }

    console.log('Permission seeding complete.');
}

seedPermissions();
