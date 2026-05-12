"""
Normalise les chemins du coverage.xml backend pour SonarCloud.
- Toutes les balises <source> -> <source>.</source>
- Tous les filename sans prefixe backend/ -> backend/<chemin>
"""
import re
import sys

coverage_file = 'backend/coverage.xml'

with open(coverage_file, 'r') as f:
    content = f.read()

# Normaliser toutes les balises <source> vers la racine du projet (.)
content = re.sub(r'<source>[^<]*</source>', '<source>.</source>', content)

# Ajouter le prefixe backend/ a tous les filename qui ne l'ont pas encore
def fix_path(m):
    fn = m.group(1)
    if not fn.startswith('backend/'):
        fn = 'backend/' + fn
    return 'filename="' + fn + '"'

content = re.sub(r'filename="([^"]+)"', fix_path, content)

with open(coverage_file, 'w') as f:
    f.write(content)

print("Coverage paths fixed successfully")
