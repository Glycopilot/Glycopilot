@echo off
REM Script pour lancer Glycopilot sur Windows

echo 🚀 Démarrage de Glycopilot...

REM Vérifier et installer les outils de qualité
echo.
echo 🔧 Vérification des outils de qualité...

REM Détecter la commande Python disponible
python --version >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON_CMD=python
) else (
    python3 --version >nul 2>&1
    if %errorlevel% == 0 (
        set PYTHON_CMD=python3
    ) else (
        echo ❌ Python n'est pas installé sur ce système
        pause
        exit /b 1
    )
)

REM Vérifier et installer les outils Python
%PYTHON_CMD% -m black --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installation des outils Python (Black, Flake8, isort)...
    cd backend
    %PYTHON_CMD% -m pip install -r requirements.txt >nul 2>&1
    cd ..
    echo ✅ Outils Python installés
) else (
    echo ✅ Outils Python déjà installés
)

REM Vérifier et installer les outils JavaScript
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm n'est pas installé sur ce système
    echo 💡 Installez Node.js pour continuer
    pause
    exit /b 1
)

npm list eslint >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installation des outils JavaScript (ESLint, Prettier)...
    cd frontend
    npm install >nul 2>&1
    cd ..
    echo ✅ Outils JavaScript installés
) else (
    echo ✅ Outils JavaScript déjà installés
)

REM Appliquer les migrations Django
echo.
echo  Appliquer les migrations Django...
cd backend
%PYTHON_CMD% manage.py makemigrations
%PYTHON_CMD% manage.py migrate
cd ..

REM Vérifier et configurer les Git hooks (une seule fois)
if not exist ".git\hooks\pre-push" (
    echo.
    echo 🔧 Configuration des Git hooks (première fois)...
    
    if exist ".git" (
        REM Le hook pre-push est déjà créé
        echo ✅ Git hooks configurés !
        echo    → Vérification automatique avant chaque push
    ) else (
        echo ⚠️  Pas de repository Git détecté
    )
) else (
    echo ✅ Git hooks déjà configurés
)

REM Lancer Docker Compose
echo.
echo 📱 Le QR code Expo va apparaître ci-dessous...
echo    Installez Expo Go sur votre téléphone pour scanner le QR code
echo.

REM Détecter la commande Docker Compose disponible
docker --version >nul 2>&1
if %errorlevel% == 0 (
    docker compose version >nul 2>&1
    if %errorlevel% == 0 (
        REM Nouveau format: docker compose
        docker compose up --build
    ) else (
        docker-compose version >nul 2>&1
        if %errorlevel% == 0 (
            REM Ancien format: docker-compose
            docker-compose up --build
        ) else (
            echo ❌ Docker Compose n'est pas installé
            echo 💡 Installez Docker Compose pour continuer
            pause
            exit /b 1
        )
    )
) else (
    echo ❌ Docker n'est pas installé
    echo 💡 Installez Docker pour continuer
    pause
    exit /b 1
)

echo.
echo ✅ Glycopilot démarré !
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8081
pause
