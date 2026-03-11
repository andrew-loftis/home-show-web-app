import fs from 'fs';
import { parse } from 'acorn';

try {
  const code = fs.readFileSync('js/views/MyCard.js', 'utf-8');
  parse(code, { ecmaVersion: 2022, sourceType: 'module' });
  console.log('✓ Syntax is valid');
} catch (error) {
  console.error('✗ Syntax error:');
  console.error('Line:', error.loc?.line);
  console.error('Column:', error.loc?.column);
  console.error('Message:', error.message);
  process.exit(1);
}
