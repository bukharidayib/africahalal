const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/pages/inspector');
const files = fs.readdirSync(dir);
files.forEach(f => {
  if (!f.startsWith('Inspector')) return;
  const p = path.join(dir, f);
  let text = fs.readFileSync(p, 'utf8');
  const newText = text
    .replace(/Inspector_reports/g, 'inspector_reports')
    .replace(/Inspector_id/g, 'inspector_id')
    .replace(/Inspector_incidents/g, 'inspector_incidents')
    .replace(/Inspector_ncrs/g, 'inspector_ncrs')
    .replace(/Inspector_observations/g, 'inspector_observations')
    .replace(/\/Inspector\/reports/g, '/inspector/reports')
    .replace(/\/Inspector\/incidents/g, '/inspector/incidents')
    .replace(/\/Inspector\/ncrs/g, '/inspector/ncrs')
    .replace(/\/Inspector\/observations/g, '/inspector/observations')
    .replace(/Inspector_sites/g, 'organizations')
    .replace(/site_id/g, 'organization_id');
  if (text !== newText) {
    fs.writeFileSync(p, newText);
    console.log(`Updated ${f}`);
  }
});
console.log('Done.');
