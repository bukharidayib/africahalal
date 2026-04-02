const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/pages/inspector');
const files = fs.readdirSync(dir);
files.forEach(f => {
  if (!f.startsWith('Inspector') && !f.startsWith('Supervisor')) return;
  const p = path.join(dir, f);
  let text = fs.readFileSync(p, 'utf8');
  let newText = text
    .replace(/Supervisor/g, 'Inspector')
    .replace(/supervisor/g, 'inspector')
    .replace(/inspector_reports/g, 'inspector_reports') /* just in case */
    .replace(/Inspector_reports/g, 'inspector_reports')
    .replace(/Inspector_id/g, 'inspector_id')
    .replace(/Inspector_incidents/g, 'inspector_incidents')
    .replace(/Inspector_ncrs/g, 'inspector_ncrs')
    .replace(/Inspector_observations/g, 'inspector_observations')
    .replace(/\/Inspector\//g, '/inspector/')
    .replace(/inspector_sites/g, 'organizations')
    .replace(/site_id/g, 'organization_id');
  if (text !== newText) {
    fs.writeFileSync(p, newText);
    console.log(`Updated ${f}`);
  }
});
console.log('Done.');
