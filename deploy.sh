#!/bin/bash
set -e

APP_DIR="/var/www/glycopilot_app"
REPO_URL="https://github.com/Glycopilot/Glycopilot.git"
BRANCH="main"

echo "Starting deployment..."

cd $APP_DIR

if [ -d ".git" ]; then
    echo "Pulling latest changes..."
    git pull origin $BRANCH
else
    echo "Cloning repository..."
    git clone -b $BRANCH $REPO_URL .
fi

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
sudo systemctl restart nginx

echo "Deployment completed successfully!"
