# Guide de Linting

## 🔄 Workflow Automatique

Le pre-commit hook a été amélioré pour **corriger automatiquement** le formatage du code Python avant chaque commit.

### Ce qui se passe lors d'un `git commit` :

1. ✅ **isort** : Organisation automatique des imports
2. ✅ **black** : Formatage automatique du code
3. ⚠️  **flake8** : Vérification de la qualité (bloque si erreurs)

### Fichiers concernés

Seuls les **fichiers Python modifiés** (staged) sont vérifiés, pas tout le projet.

## 🛠️ Commandes Utiles

### Corriger tout le backend
```bash
./scripts/fix_backend.sh
```

### Corriger manuellement
```bash
cd backend
python -m isort .
python -m black .
python -m flake8 .
```

### Bypass le pre-commit (non recommandé)
```bash
git commit --no-verify -m "votre message"
```

## 📝 Configuration

- **Black** : `backend/pyproject.toml` - Ligne max: 88 caractères
- **isort** : `backend/pyproject.toml` - Compatible avec Black
- **flake8** : `backend/.flake8` - Règles de qualité

## 🔍 Erreurs Flake8 Courantes

### F401 - Import non utilisé
```python
# ❌ À supprimer
from django.db.models import Sum

# ✅ Ou utiliser noqa si intentionnel
import apps.profiles.signals  # noqa: F401
```

### F841 - Variable assignée mais non utilisée
```python
# ❌ Variable inutile
account = AuthAccount.objects.create(...)

# ✅ Utiliser _ pour indiquer que c'est intentionnel
_ = AuthAccount.objects.create(...)
```

### E402 - Import après du code
```python
# ❌
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
from django.core.asgi import get_asgi_application

# ✅ Importer en haut, ou utiliser noqa
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
from django.core.asgi import get_asgi_application  # noqa: E402
```

## 🎯 Avantages du nouveau système

- ✅ **Un seul commit** : Plus besoin de corriger manuellement et recommit
- ✅ **Rapide** : Vérifie seulement les fichiers modifiés
- ✅ **Automatique** : isort et black s'appliquent tout seuls
- ✅ **Qualité** : flake8 bloque les vrais problèmes
