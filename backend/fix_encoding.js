const fs = require('fs');

function fixDeepMojibake(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let result = '';
  let fixedCount = 0;
  
  for(let i=0; i<content.length; i++) {
    if (content[i] === 'Ã' || content[i] === 'Â' || content[i] === 'â') {
      // It might be a 2-byte or 3-byte sequence
      if (content[i] === 'â') {
         // likely 3 bytes: e.g. âœ“ (E2 9C 93) -> ✓
         const seq = content.substring(i, i+3);
         const bytes = Buffer.from(seq, 'latin1');
         const decoded = bytes.toString('utf8');
         if (decoded.length === 1 && decoded !== '') {
           result += decoded;
           i += 2;
           fixedCount++;
           continue;
         }
      } else {
         // likely 2 bytes: e.g. Ã³ (C3 B3) -> ó
         const seq = content.substring(i, i+2);
         const bytes = Buffer.from(seq, 'latin1');
         const decoded = bytes.toString('utf8');
         // Check if decoded correctly
         if (decoded.length === 1 && decoded !== '') {
           result += decoded;
           i += 1;
           fixedCount++;
           continue;
         }
      }
    }
    result += content[i];
  }
  
  fs.writeFileSync(filePath, result, 'utf-8');
  console.log(`Fixed ${fixedCount} sequences in ${filePath}`);
}

fixDeepMojibake('src/reportes/reportes.service.ts');
fixDeepMojibake('src/reportes/reportes.controller.ts');
