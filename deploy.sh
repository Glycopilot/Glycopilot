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
pip install -r requirements.txt

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Restarting services..."
sudo systemctl restart gunicorn
sudo systemctl reload nginx

echo "Deployment completed successfully!"
