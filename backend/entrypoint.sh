#!/bin/bash

echo "=== Glycopilot Backend Entrypoint ==="

# Configurer Django settings
export DJANGO_SETTINGS_MODULE=core.settings

# Attendre que la base de données soit prête
echo "Waiting for database..."
while ! nc -z database 3306; do
    sleep 1
done
echo "Database is ready!"
sleep 2

# Variables de DB
DB_NAME="${DB_NAME:-glycopilot_db}"
DB_USER="${DB_USER:-glycopilot_user}"
DB_PASSWORD="${DB_PASSWORD:-glycopilot_password}"
DB_HOST="${DB_HOST:-database}"

# Mode développement : si les migrations échouent, reset la DB
ENV=${Django_ENV:-development}
echo "Environment: $ENV"

# Fonction pour tenter les migrations
try_migrate() {
    echo "Attempting migrations..."
    python manage.py migrate --noinput 2>&1
    return $?
}

# Fonction pour reset complet de la DB via MySQL root
reset_database() {
    echo "=== RESETTING DATABASE (Dev Mode) ==="
    echo "Dropping and recreating database: $DB_NAME"

    # Utiliser mysql client pour drop/create (via root)
    mysql -h "$DB_HOST" -u root -p"${MYSQL_ROOT_PASSWORD:-rootpass}" -e "
        DROP DATABASE IF EXISTS \`$DB_NAME\`;
        CREATE DATABASE \`$DB_NAME\`;
        GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'%';
        FLUSH PRIVILEGES;
    " 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "Database reset complete via MySQL client"
    else
        echo "MySQL client not available, trying Python fallback..."
        # Fallback: utiliser Python avec connexion séparée
        python << EOF
import MySQLdb
conn = MySQLdb.connect(
    host='$DB_HOST',
    user='root',
    password='${MYSQL_ROOT_PASSWORD:-rootpass}'
)
cursor = conn.cursor()
cursor.execute('DROP DATABASE IF EXISTS \`$DB_NAME\`')
cursor.execute('CREATE DATABASE \`$DB_NAME\`')
cursor.execute("GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'%'")
cursor.execute('FLUSH PRIVILEGES')
conn.commit()
cursor.close()
conn.close()
print('Database reset complete via Python')
EOF
    fi
}

# Fonction pour seed les données initiales
seed_data() {
    echo "Seeding initial data..."
    python manage.py shell << 'SEEDEOF'
from apps.profiles.models.role import Role
from apps.doctors.models.status import VerificationStatus, InvitationStatus
from apps.doctors.models.specialty import Specialty

# Roles
for r in ['SUPERADMIN', 'ADMIN', 'PATIENT', 'DOCTOR']:
    Role.objects.get_or_create(name=r)
print('Roles created')

# Specialties
for s in ['Generaliste', 'Diabetologue', 'Endocrinologue', 'Cardiologue', 'Nutritionniste']:
    Specialty.objects.get_or_create(name=s)
print('Specialties created')

# Verification Status
for s in ['PENDING', 'VERIFIED', 'REJECTED']:
    VerificationStatus.objects.get_or_create(label=s)
print('VerificationStatus created')

# Invitation Status
for s in ['PENDING', 'ACTIVE', 'REJECTED', 'ENDED']:
    InvitationStatus.objects.get_or_create(label=s)
print('InvitationStatus created')

# Test users for dev
from apps.users.models import User
from django.contrib.auth import get_user_model
from apps.profiles.models import Profile, Role

AuthAccount = get_user_model()

if not AuthAccount.objects.filter(email="patient@example.com").exists():
    u = User.objects.create(first_name="Jean", last_name="Dupont", phone_number="0600000000")
    AuthAccount.objects.create_user(email="patient@example.com", password="StrongPass123!", user_identity=u)
    role = Role.objects.get(name="PATIENT")
    Profile.objects.create(user=u, role=role)
    print("Created patient@example.com / StrongPass123!")

if not AuthAccount.objects.filter(email="doctor@example.com").exists():
    u = User.objects.create(first_name="Gregory", last_name="House")
    AuthAccount.objects.create_user(email="doctor@example.com", password="StrongPass123!", user_identity=u)
    role = Role.objects.get(name="DOCTOR")
    Profile.objects.create(user=u, role=role)
    print("Created doctor@example.com / StrongPass123!")

print('Seed data complete!')
SEEDEOF
}

if [ "$ENV" != "production" ]; then
    # Essayer les migrations
    if ! try_migrate; then
        echo ""
        echo "!!! Migration failed - Resetting database !!!"
        echo ""

        # Reset la database
        reset_database

        # Réessayer les migrations
        echo "Retrying migrations after reset..."
        python manage.py migrate --noinput

        # Seed les données initiales
        seed_data

        echo "=== Database reset and seeded successfully ==="
    fi
else
    # Production : ne jamais reset automatiquement
    echo "Production mode - attempting migrations only..."
    if ! try_migrate; then
        echo "!!! Migration failed in production !!!"
        echo "Please fix migrations manually or use --force reset"
        exit 1
    fi
fi

echo "=== Starting Django server ==="
exec python manage.py runserver 0.0.0.0:8000
