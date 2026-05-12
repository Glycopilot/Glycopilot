#!/bin/bash
set -e

APP_DIR="/var/www/glycopilot_app"

echo "Starting deployment..."
cd $APP_DIR

echo "Installing backend dependencies..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install psycopg2-binary
grep -v "mysqlclient" requirements.txt > requirements-prod.txt
pip install -r requirements-prod.txt

echo "Running migrations..."
python manage.py migrate --noinput

echo "Importing reference medications (CSV)..."
python manage.py import_medications

if [ -f "data/import/CIS_bdpm.txt" ]; then
    echo "Importing BDPM full database..."
    python manage.py import_medications --bdpm
else
    echo "CIS_bdpm.txt not found — skipping BDPM import (place the file in backend/data/import/ to import ~15000 medications)"
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Restarting services..."
sudo systemctl restart gunicorn
sudo systemctl reload nginx

echo "Deployment completed successfully!"
