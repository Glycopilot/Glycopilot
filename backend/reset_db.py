import os
import shutil
import glob
import sys
from decouple import config
from django.core.management import execute_from_command_line
from django.db import connection

def reset_database():
    print("=== STARTING DATABASE RESET ===")
    
    # Setup Django to access DB connection
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    import django
    django.setup()

    # --- SAFETY CHECK FOR PRODUCTION ---
    # We load ENV using python-decouple logic or from settings
    # But since settings is already loaded, we can use settings.ENV if exposed, 
    # OR config("Django_ENV") directly.
    current_env = config("Django_ENV", default="development")
    
    # Warning: if production, we ABORT unless --force is passed
    if current_env == "production":
        if "--force" not in sys.argv:
            print("!!!!!!! DANGER !!!!!!!") 
            print("You are trying to RESET the database in PRODUCTION environment.")
            print("This will DESTROY ALL DATA in your MySQL/Postgres database.")
            print("If you really want to do this, run: python reset_db.py --force")
            print("Process Aborted.")
            sys.exit(1)
        else:
            print("!!! PRODUCTION RESET FORCED !!!")
            print("Waiting 5 seconds before destruction...")
            import time
            time.sleep(5)

    db_engine = connection.settings_dict['ENGINE']
    print(f"... Detected Database Engine: {db_engine} ...")
    
    if 'sqlite' in db_engine:
        # SQLite: Delete file
        db_path = connection.settings_dict['NAME']
        try:
            connection.close() # Ensure connection is closed
            if os.path.exists(db_path):
                os.remove(db_path)
                print(f"✓ Deleted SQLite file: {db_path}")
        except Exception as e:
            print(f"warning: Could not delete sqlite file directly: {e}")
    else:
        # MySQL/Postgres: Drop Tables
        print("... Dropping all tables (MySQL/Postgres mode) ...")
        with connection.cursor() as cursor:
            if 'mysql' in db_engine:
                # MySQL: Drop and Recreate Database for a full clean reset
                db_name = connection.settings_dict['NAME']
                cursor.execute(f"DROP DATABASE IF EXISTS `{db_name}`;")
                cursor.execute(f"CREATE DATABASE `{db_name}`;")
                cursor.execute(f"USE `{db_name}`;")
                print(f"✓ Recreated MySQL Database: {db_name}")
            else:
                # Postgres/SQLite/Other: Drop Tables
                # (SQLite is handled above, this is mostly for Postgres)
                table_names = connection.introspection.table_names()
                
                if table_names:
                    for table in table_names:
                        cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                    print(f"✓ Dropped {len(table_names)} tables")
                else:
                    print("✓ DB was already empty")
    

    apps_list = ["users", "profiles", "doctors", "auth", "glycemia", "meals", "activities", "alerts", "medications", "notifications"]
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    for app in apps_list:
        migration_path = os.path.join(base_dir, "apps", app, "migrations")
        if os.path.exists(migration_path):
            files = glob.glob(os.path.join(migration_path, "*.py"))
            for f in files:
                if "__init__.py" not in f:
                    try:
                        os.remove(f)
                    except OSError as e:
                        print(f"warning: Could not remove {f}: {e}")
            
            # Remove __pycache__
            pycache = os.path.join(migration_path, "__pycache__")
            if os.path.exists(pycache):
                shutil.rmtree(pycache, ignore_errors=True)
            print(f"✓ Cleared migrations for {app}")
        else:
            os.makedirs(migration_path, exist_ok=True)
            with open(os.path.join(migration_path, "__init__.py"), "w") as f:
                pass

    print("... Making Migrations ...")
    execute_from_command_line(["manage.py", "makemigrations"])
    

    print("... Migrating ...")
    execute_from_command_line(["manage.py", "migrate"])
    

    print("... Seeding Initial Data ...")
    from apps.profiles.models import Role
    from apps.doctors.models.status import VerificationStatus, InvitationStatus
    from apps.doctors.models.specialty import Specialty

    # Roles
    roles = ["SUPERADMIN", "ADMIN", "PATIENT", "DOCTOR"]
    for r in roles:
        Role.objects.get_or_create(name=r)
    print("✓ Roles created")

    # Specialties - Seed some defaults
    specialties = ["Generaliste", "Diabetologue", "Endocrinologue", "Cardiologue", "Nutritionniste"]
    for s in specialties:
        Specialty.objects.get_or_create(name=s)
    print("✓ Specialties created")

    # Verification Status
    v_statuses = ["PENDING", "VERIFIED", "REJECTED"]
    for s in v_statuses:
        VerificationStatus.objects.get_or_create(label=s)
    print("✓ VerificationStatus created")

    # Invitation Status
    i_statuses = ["PENDING", "ACTIVE", "REJECTED", "ENDED"]
    for s in i_statuses:
        InvitationStatus.objects.get_or_create(label=s)
    print("✓ InvitationStatus created")

    # Seed Users (Dev only)
    if current_env != "production":
        print("... Seeding Test Users ...")
        from apps.users.models import User
        from django.contrib.auth import get_user_model
        from apps.profiles.models import Profile
        AuthAccount = get_user_model()


        if not AuthAccount.objects.filter(email="patient@example.com").exists():
            u = User.objects.create(first_name="Jean", last_name="Dupont", phone_number="0600000000")
            AuthAccount.objects.create_user(email="patient@example.com", password="StrongPass123!", user_identity=u)
            role = Role.objects.get(name="PATIENT")
            Profile.objects.create(user=u, role=role)
            print("  -> Created patient@example.com / StrongPass123!")


        if not AuthAccount.objects.filter(email="doctor@example.com").exists():
            u = User.objects.create(first_name="Gregory", last_name="House")
            AuthAccount.objects.create_user(email="doctor@example.com", password="StrongPass123!", user_identity=u)
            role = Role.objects.get(name="DOCTOR")
            p = Profile.objects.create(user=u, role=role)
            

            if hasattr(p, 'doctor_profile'):
                v_status = VerificationStatus.objects.get(label="VERIFIED")
                p.doctor_profile.verification_status = v_status
                p.doctor_profile.license_number = "123456789"
                p.doctor_profile.save()
            print("  -> Created doctor@example.com / StrongPass123! (VERIFIED)")

        # Superadmin (pour créer d'autres admins et valider les docteurs)
        if not AuthAccount.objects.filter(email="superadmin@example.com").exists():
            u = User.objects.create(first_name="Super", last_name="Admin")
            AuthAccount.objects.create_user(
                email="superadmin@example.com",
                password="StrongPass123!",
                user_identity=u,
                is_staff=True,
                is_superuser=True,
            )
            role = Role.objects.get(name="SUPERADMIN")
            Profile.objects.create(user=u, role=role)
            print("  -> Created superadmin@example.com / StrongPass123! (SUPERADMIN)")

    
    print("=== DATABASE RESET COMPLETE ===")

if __name__ == "__main__":
    reset_database()
