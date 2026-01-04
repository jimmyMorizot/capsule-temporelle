# 🕰️ Capsule Temporelle API

API REST pour créer et gérer des capsules temporelles - des messages stockés avec une date de déverrouillage.

**Challenge DevChallenges #2026-WEEK-01**

## 🚀 Installation

### Prérequis
- PHP 8.4+
- Composer
- Symfony CLI

### Étapes

```bash
# Cloner le projet
git clone <repository-url>
cd capsule-temporelle

# Installer les dépendances
composer install

# Compiler les assets (si nécessaire)
php bin/console asset-map:compile

# Vider le cache
php bin/console cache:clear

# Démarrer le serveur
symfony serve -d
```

L'API sera accessible sur `http://127.0.0.1:8000`

### Commandes utiles

```bash
# Arrêter le serveur
symfony server:stop

# Voir les logs
symfony server:log

# Build complet (production)
composer install --no-dev --optimize-autoloader
php bin/console cache:clear --env=prod
php bin/console asset-map:compile
```

## 📡 Endpoints

### POST /api/capsule - Créer une capsule

```bash
curl -X POST http://127.0.0.1:8000/api/capsule \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Mon message secret",
    "unlockDate": "2026-12-31T23:59:00+00:00"
  }'
```

### GET /api/capsule - Récupérer la capsule

```bash
curl -X GET http://127.0.0.1:8000/api/capsule
```

## 📊 Codes HTTP

| Code | Cas |
|------|-----|
| 201 | Capsule créée |
| 200 | Capsule déverrouillée |
| 403 | Capsule verrouillée |
| 404 | Aucune capsule |
| 400 | Erreur de validation |

