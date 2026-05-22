# EC2 Database Backup

Objectif : sauvegarder la base PostgreSQL canonique vers S3, que le runtime
pointe encore vers `database_aws` ou déjà vers RDS.

Le script lit :

- `.env` pour `DB_HOST` et `DB_PORT` ;
- `backend/.env.prod` pour `DB_NAME`, `DB_USER`, `DB_PASSWORD` ou les variables
  `POSTGRES_*`.

Si `backend/.env.prod` contient plusieurs fois une variable `DB_*`, la dernière
valeur gagne, comme au runtime Django. Quand `DB_HOST` pointe hors du conteneur
`database_aws`, le script force `PGSSLMODE=require` pour RDS.

Il n'affiche jamais le mot de passe.

## Installation manuelle

Depuis l'EC2 :

```bash
cd /home/ubuntu/glycopilot-app

sudo install -m 0755 infra/ec2-backup/glycopilot-db-backup.sh /usr/local/sbin/glycopilot-db-backup
sudo install -m 0644 infra/ec2-backup/glycopilot-db-backup.env /etc/default/glycopilot-db-backup
sudo install -m 0644 infra/ec2-backup/glycopilot-db-backup.service /etc/systemd/system/glycopilot-db-backup.service
sudo install -m 0644 infra/ec2-backup/glycopilot-db-backup.timer /etc/systemd/system/glycopilot-db-backup.timer
sudo systemctl daemon-reload
```

Le timer est planifié à `02:15 UTC`, avant la fenêtre de backup automatique RDS
déclarée dans Terraform (`03:00-04:00 UTC`).

## Test ponctuel

```bash
sudo systemctl start glycopilot-db-backup.service
journalctl -u glycopilot-db-backup.service -n 80 --no-pager
aws s3 ls s3://glycopilot-aws-s3-bucket-img-artifacts/database-backups/ | tail -n 5
```

## Ancien cron

Avant activation du timer, vérifier l'ancien mécanisme de backup :

```bash
crontab -l || true
sudo crontab -l || true
sudo ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly
sudo grep -R "DATA_GLYCO\\|database-backups\\|glycopilot-backup\\|pg_dump" /etc/cron* /home/ubuntu 2>/dev/null || true
```

Si un ancien cron lance encore le backup `DATA_GLYCO_*`, le désactiver avant
`enable --now` du timer systemd. Garder le fichier/script ancien quelques jours,
mais retirer son déclenchement automatique.

## Activation quotidienne

Activer seulement après avoir désactivé l'ancien cron/script de backup pour
éviter les doublons.

```bash
sudo systemctl enable --now glycopilot-db-backup.timer
systemctl status glycopilot-db-backup.timer
systemctl list-timers glycopilot-db-backup.timer
```

Après activation, vérifier le prochain déclenchement :

```bash
systemctl list-timers --all | grep glycopilot-db-backup
```

## Rollback

```bash
sudo systemctl disable --now glycopilot-db-backup.timer
sudo systemctl reset-failed glycopilot-db-backup.service
```
