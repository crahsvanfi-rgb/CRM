const fs = require('fs');
const files = [
  'src/modules/campaigns/campaigns.module.ts',
  'src/modules/campaigns/campaigns.controller.ts',
  'src/modules/campaigns/campaigns.service.ts',
  'src/modules/segments/segments.module.ts',
  'src/modules/segments/segments.controller.ts',
  'src/modules/segments/segments.service.ts'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/from\s+['"](\.[^'"]+)['"]/g, (m, g) => g.endsWith('.js') ? m : `from '${g}.js'`);
  fs.writeFileSync(f, c);
  console.log('Fixed', f);
});
