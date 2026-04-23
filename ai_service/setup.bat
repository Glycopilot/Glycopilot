@echo off
echo ========================================
echo  Glycopilot AI Service - Setup (Windows)
echo ========================================

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python n'est pas installe ou pas dans le PATH.
    echo Telecharge Python 3.11 sur https://www.python.org/downloads/
    echo Coche bien "Add Python to PATH" pendant l'installation.
    pause
    exit /b 1
)

echo [OK] Python detecte.

:: Create virtual env
if not exist ".venv" (
    echo [INFO] Creation de l'environnement virtuel...
    python -m venv .venv
    echo [OK] Environnement virtuel cree dans .venv\
) else (
    echo [OK] Environnement virtuel existant detecte.
)

:: Activate and install deps
echo [INFO] Installation des dependances...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt

if errorlevel 1 (
    echo [ERROR] L'installation des dependances a echoue.
    pause
    exit /b 1
)

:: Copy .env if not exists
if not exist ".env" (
    copy .env.example .env >nul
    echo [OK] Fichier .env cree depuis .env.example
) else (
    echo [OK] Fichier .env existant conserve.
)

:: Create artifact dirs
if not exist "artifacts\baseline" mkdir artifacts\baseline
if not exist "artifacts\xgboost" mkdir artifacts\xgboost
if not exist "artifacts\lstm" mkdir artifacts\lstm
if not exist "artifacts\transformer" mkdir artifacts\transformer
if not exist "artifacts\ensemble" mkdir artifacts\ensemble
if not exist "artifacts\scalers" mkdir artifacts\scalers
if not exist "artifacts\metadata" mkdir artifacts\metadata
echo [OK] Dossiers artifacts/ crees.

echo.
echo ========================================
echo  Setup termine !
echo ========================================
echo.
echo  Pour activer l'environnement :
echo    .venv\Scripts\activate
echo.
echo  Pour entrainer un modele :
echo    make train-baseline
echo    make train-xgboost
echo    make train-lstm
echo    make train-transformer
echo    make train-ensemble
echo.
echo  Ou directement :
echo    python training\train_baseline.py
echo    python training\train_xgboost.py
echo    python training\train_lstm.py
echo    python training\train_transformer.py
echo    python training\train_ensemble.py
echo.
pause
