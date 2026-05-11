const fs = require('fs');
const path = require('path');

const lcovPath = path.join(__dirname, '../coverage/lcov.info');

if (fs.existsSync(lcovPath)) {
  let content = fs.readFileSync(lcovPath, 'utf8');
  // Remplacer SF:src/ par SF:frontend/src/
  // On utilise un regex pour être sûr de ne pas faire de remplacements partiels
  content = content.replace(/^SF:src\//gm, 'SF:frontend/src/');
  fs.writeFileSync(lcovPath, content);
  console.log('✅ Chemins lcov.info corrigés pour SonarCloud');
} else {
  console.log('⚠️ lcov.info non trouvé à', lcovPath);
}
