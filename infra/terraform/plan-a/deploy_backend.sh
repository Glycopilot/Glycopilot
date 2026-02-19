#!/bin/bash
# Deployment script for Glycopilot backend on EC2
# This script should be run after Terraform creates the infrastructure

set -e

echo "=== Starting Glycopilot Backend Deployment ==="

# Update and install dependencies
echo "Updating system and installing dependencies..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx git

# Install and configure PostgreSQL
echo "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE glycopilot_db;"
sudo -u postgres psql -c "CREATE USER glycopilot_user WITH PASSWORD 'secure_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE glycopilot_db TO glycopilot_user;"
sudo -u postgres psql -c "ALTER USER glycopilot_user CREATEDB;"

# Configure PostgreSQL to listen on all interfaces
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf
sudo echo "host    all             all             10.0.0.0/16            md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf
sudo systemctl restart postgresql

# Create project directory
echo "Setting up project directory..."
sudo mkdir -p /var/www/glycopilot
sudo chown -R $USER:$USER /var/www/glycopilot
cd /var/www/glycopilot

# Clone the repository (replace with your actual repo)
echo "Cloning repository..."
git clone https://github.com/your-username/glycopilot.git .

# Set up Python virtual environment
echo "Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Configure environment variables
echo "Setting up environment variables..."
cat > backend/.env << 'EOL'
# Django Configuration
DEBUG=False
SECRET_KEY=your-secret-key-here
SECRET_KEY_ADMIN=your-admin-secret-key-here
ALLOWED_HOSTS=.glycopilot.com,localhost,127.0.0.1

# Database Configuration
DB_ENGINE=postgresql
DB_NAME=glycopilot_db
DB_USER=glycopilot_user
DB_PASSWORD=secure_password_here
DB_HOST=localhost
DB_PORT=5432

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=eu-west-3

# JWT Configuration
ACCESS_TOKEN_MINUTES=60
REFRESH_TOKEN_DAYS=7

# Frontend URL
FRONTEND_URL=https://your-frontend-url.com
EOL

# Run database migrations
echo "Running database migrations..."
cd backend
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Configure Nginx
echo "Configuring Nginx..."
sudo cat > /etc/nginx/sites-available/glycopilot << 'EOL'
server {
    listen 80;
    server_name your-domain.com;

    location = /favicon.ico { access_log off; log_not_found off; }
    location /static/ {
        root /var/www/glycopilot/backend;
    }

    location /media/ {
        root /var/www/glycopilot/backend;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/glycopilot/backend/glycopilot.sock;
    }
}
EOL

sudo ln -s /etc/nginx/sites-available/glycopilot /etc/nginx/sites-enabled
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# Set up Gunicorn systemd service
echo "Setting up Gunicorn..."
sudo cat > /etc/systemd/system/glycopilot.service << 'EOL'
[Unit]
Description=Glycopilot Django Application
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/glycopilot/backend
Environment="PATH=/var/www/glycopilot/venv/bin"
ExecStart=/var/www/glycopilot/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:/var/www/glycopilot/backend/glycopilot.sock core.wsgi:application

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl daemon-reload
sudo systemctl start glycopilot
sudo systemctl enable glycopilot

echo "=== Deployment Complete! ==="
echo "Your Glycopilot backend should now be running at http://$(curl -s ifconfig.me)"