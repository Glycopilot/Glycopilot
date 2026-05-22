# EC2 Watchdog

Watchdog applicatif pour le socle commun EC2.

Objectif : restaurer automatiquement le service si le backend ne repond plus,
sans redemarrer brutalement l'instance au premier incident.

## Strategie

- toutes les 5 minutes, `curl` teste l'URL configuree ;
- si la reponse HTTP est `200`, le compteur d'echecs est remis a zero ;
- apres 2 echecs consecutifs, le watchdog relance les services Docker Compose ;
- apres 4 echecs consecutifs, le watchdog redemarre l'EC2.

Le reboot EC2 est volontairement un dernier recours, car la base PostgreSQL
tourne encore sur cette meme instance.

## Installation sur l'EC2

Depuis le repo deja synchronise sur l'EC2 :

```bash
cd /home/ubuntu/glycopilot-app

sudo install -m 0755 infra/ec2-watchdog/glycopilot-healthcheck.sh \
  /usr/local/sbin/glycopilot-healthcheck

sudo install -m 0644 infra/ec2-watchdog/glycopilot-healthcheck.env \
  /etc/default/glycopilot-healthcheck

sudo install -m 0644 infra/ec2-watchdog/glycopilot-healthcheck.service \
  /etc/systemd/system/glycopilot-healthcheck.service

sudo install -m 0644 infra/ec2-watchdog/glycopilot-healthcheck.timer \
  /etc/systemd/system/glycopilot-healthcheck.timer

sudo systemctl daemon-reload
sudo systemctl enable --now glycopilot-healthcheck.timer
```

## Configuration

Fichier :

```text
/etc/default/glycopilot-healthcheck
```

Par defaut, le watchdog teste :

```text
HEALTHCHECK_URL=http://127.0.0.1/
```

Tu peux mettre l'IP publique si tu veux tester le chemin public :

```text
HEALTHCHECK_URL=http://15.x.x.x/
```

Pour l'instant, `127.0.0.1` est plus stable pour detecter l'etat reel du
runtime Nginx -> backend sans dependre d'un aller-retour reseau public.

## Test Etape Par Etape

### 1. Verifier l'installation

```bash
systemctl status glycopilot-healthcheck.timer
systemctl cat glycopilot-healthcheck.service
systemctl cat glycopilot-healthcheck.timer
```

Resultat attendu :

```text
Active: active (waiting)
```

### 2. Lancer un check sain manuel

```bash
sudo systemctl start glycopilot-healthcheck.service
journalctl -u glycopilot-healthcheck.service -n 20 --no-pager
```

Resultat attendu :

```text
healthy url=http://127.0.0.1/ http_code=200
```

Tu peux aussi verifier le compteur :

```bash
sudo cat /var/lib/glycopilot-healthcheck/failures
```

Resultat attendu :

```text
0
```

### 3. Tester une panne sans risque de reboot

Avant de simuler une panne, neutralise temporairement le reboot automatique :

```bash
sudo cp /etc/default/glycopilot-healthcheck /tmp/glycopilot-healthcheck.env.bak
sudo sed -i 's#^HEALTHCHECK_URL=.*#HEALTHCHECK_URL=http://127.0.0.1/__glycopilot_missing_healthcheck__#' /etc/default/glycopilot-healthcheck
sudo sed -i 's#^FAILURES_BEFORE_REBOOT=.*#FAILURES_BEFORE_REBOOT=99#' /etc/default/glycopilot-healthcheck
```

Lance deux checks manuels :

```bash
sudo systemctl start glycopilot-healthcheck.service
sudo systemctl start glycopilot-healthcheck.service
journalctl -u glycopilot-healthcheck.service -n 80 --no-pager
```

Resultat attendu au deuxieme echec :

```text
restart threshold reached; restarting Docker Compose services
```

Verifie que les conteneurs sont revenus :

```bash
cd /home/ubuntu/glycopilot-app
docker compose --profile aws ps
curl -i http://127.0.0.1/
```

### 4. Restaurer la configuration normale

```bash
sudo cp /tmp/glycopilot-healthcheck.env.bak /etc/default/glycopilot-healthcheck
sudo rm -f /var/lib/glycopilot-healthcheck/failures
sudo systemctl start glycopilot-healthcheck.service
journalctl -u glycopilot-healthcheck.service -n 20 --no-pager
```

Resultat attendu :

```text
healthy url=http://127.0.0.1/ http_code=200
```

### 5. Laisser tourner et observer

Apres 15 a 30 minutes :

```bash
systemctl list-timers glycopilot-healthcheck.timer
journalctl -u glycopilot-healthcheck.service --since "30 minutes ago" --no-pager
```

Resultat attendu : des checks sains toutes les 5 minutes.

## Commandes utiles

Voir le timer :

```bash
systemctl status glycopilot-healthcheck.timer
```

Lancer un check manuel :

```bash
sudo systemctl start glycopilot-healthcheck.service
```

Voir les logs :

```bash
journalctl -u glycopilot-healthcheck.service -n 100 --no-pager
```

Desactiver :

```bash
sudo systemctl disable --now glycopilot-healthcheck.timer
```
