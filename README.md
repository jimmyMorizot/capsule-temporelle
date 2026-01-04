# 🕰️ Capsule Temporelle API

API REST pour créer et gérer des capsules temporelles - des messages stockés avec une date de déverrouillage, inaccessibles jusqu'à cette date.

**Challenge DevChallenges #2026-WEEK-01**

## 📋 Description

Cette API permet de :
- Créer une capsule avec un message et une date de déverrouillage
- Consulter la capsule (seulement si la date est atteinte)
- Voir le temps restant avant déverrouillage

## 🛠️ Stack Technique

- **Backend** : Symfony 8.0 (PHP 8.4+)
- **Persistence** : Stockage fichier JSON (pas de base de données)
- **Validation** : Symfony Validator
- **Serialization** : JSON natif
- **Testing** : PHPUnit 12.5+ (optionnel)

## 🚀 Installation

### Prérequis
- PHP 8.4+
- Composer

### Étapes

```bash
# Cloner le projet
git clone <repository-url>
cd capsule-temporelle

# Installer les dépendances
composer install

# Démarrer le serveur
php -S localhost:8000 -t public/
```

L'API sera accessible sur `http://localhost:8000`

## 📡 API Endpoints

### POST /api/capsule - Créer une capsule

Crée ou écrase la capsule existante avec un nouveau message.

**Request**
```bash
curl -X POST http://localhost:8000/api/capsule \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Mon message secret pour le futur",
    "unlockDate": "2026-12-31T23:59:00+00:00"
  }'
```

**Response (201 Created)**
```json
{
  "status": "success",
  "message": "Capsule créée avec succès",
  "unlockDate": "2026-12-31T23:59:00+00:00"
}
```

**Validation**
- `message` : string, 1-5000 caractères, obligatoire
- `unlockDate` : format ISO 8601 (YYYY-MM-DDTHH:MM:SS±HH:MM), dans le futur, obligatoire

**Erreurs possibles (400 Bad Request)**
```json
{
  "status": "error",
  "errors": {
    "message": "Le message ne peut pas être vide",
    "unlockDate": "La date doit être au format ISO 8601 (exemple: 2026-01-10T23:59:00+00:00)"
  }
}
```

---

### GET /api/capsule - Récupérer la capsule

Récupère la capsule si elle est déverrouillée, sinon retourne le temps restant.

**Request**
```bash
curl -X GET http://localhost:8000/api/capsule
```

**Response - Capsule verrouillée (403 Forbidden)**
```json
{
  "status": "locked",
  "message": "Capsule verrouillée. Déverrouillage dans 10 jours 23 heures 45 minutes",
  "unlockDate": "2026-12-31T23:59:00+00:00"
}
```

**Response - Capsule déverrouillée (200 OK)**
```json
{
  "status": "unlocked",
  "message": "Mon message secret pour le futur",
  "unlockDate": "2026-12-31T23:59:00+00:00",
  "createdAt": "2026-01-04T10:30:00+00:00"
}
```

**Response - Aucune capsule (404 Not Found)**
```json
{
  "status": "error",
  "message": "Aucune capsule trouvée"
}
```

## 📂 Architecture

```
src/
├── Controller/
│   └── CapsuleController.php      # Routes API (POST/GET)
├── Service/
│   └── CapsuleService.php         # Logique métier + JSON storage
└── DTO/
    └── CapsuleRequest.php         # Validation des données

var/data/
└── capsule.json                   # Stockage unique capsule
```

## 🧪 Tests manuels

### Créer une capsule
```bash
curl -X POST http://localhost:8000/api/capsule \
  -H "Content-Type: application/json" \
  -d '{"message":"Test!","unlockDate":"2026-12-31T23:59:00+00:00"}'
```

### Consulter la capsule (verrouillée)
```bash
curl -X GET http://localhost:8000/api/capsule
# → HTTP 403 avec temps restant
```

### Consulter la capsule (déverrouillée)
Pour tester le déverrouillage, créez une capsule avec une date proche :
```bash
# Date dans 1 minute
UNLOCK_DATE=$(date -u -d "+1 minute" +"%Y-%m-%dT%H:%M:%S+00:00")
curl -X POST http://localhost:8000/api/capsule \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Message test\",\"unlockDate\":\"$UNLOCK_DATE\"}"

# Attendre 1 minute puis :
curl -X GET http://localhost:8000/api/capsule
# → HTTP 200 avec le message
```

## 🔒 Règles Métier

1. **Une seule capsule** : Chaque POST écrase la capsule précédente
2. **Date stricte** : Format ISO 8601 avec timezone obligatoire
3. **Futur uniquement** : `unlockDate` doit être > date actuelle
4. **Lecture conditionnelle** : GET retourne le contenu seulement si `now >= unlockDate`
5. **Temps restant** : Formatage lisible "X jours Y heures Z minutes"

## 📊 Codes HTTP

| Code | Cas |
|------|-----|
| 201 | Capsule créée avec succès |
| 200 | Capsule déverrouillée récupérée |
| 403 | Capsule verrouillée (date non atteinte) |
| 404 | Aucune capsule trouvée |
| 400 | Erreur de validation |

## 🐛 Troubleshooting

**Erreur "Invalid JSON"**
- Vérifiez le format JSON (guillemets doubles, échappement correct)
- Utilisez `--data-binary @file.json` pour éviter les problèmes d'encodage

**Erreur "La date doit être dans le futur"**
- Vérifiez la timezone (+00:00 ou votre timezone locale)
- Utilisez une date suffisamment éloignée (au moins 1 minute dans le futur)

**Erreur "Service validator not found"**
- Videz le cache : `php bin/console cache:clear`

## 📝 Licence

Projet d'apprentissage - Challenge DevChallenges
