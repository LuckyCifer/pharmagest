# PharmaGest — Système de Gestion de Pharmacie

Projet tutoré — Licence Génie Logiciel — ACERFI Formation  
Stack : **React 18 + Vite** / **Django 5 + DRF** / **MySQL 8**

---

## Prérequis

- Python 3.11+
- Node.js 18+
- MySQL 8.0+
- Git

---

## Démarrage rapide avec Docker

Prérequis : Docker Desktop.

```bash
docker compose up -d --build
```

- Application : http://localhost:8080
- Admin Django : http://localhost:8080/admin/
- MySQL (depuis l'hôte) : `localhost:3307`, utilisateur `root`, mot de passe `pharmagest`

Au premier démarrage, MySQL importe les fichiers `.sql` placés dans `pharma-frontend/docker/mysql-init/` (non versionnés).
Pour réimporter le dump : `docker compose down -v` puis `docker compose up -d`.
Les variables (`SECRET_KEY`, `DB_PASSWORD`, `VITE_PHARMACIE_*`…) peuvent être définies dans un fichier `.env` à la racine.

---

## 1. Cloner le projet

```bash
git clone https://github.com/LuckyCifer/pharmagest.git
cd pharmagest
```

---

## 2. Backend Django

### 2.1 Créer la base de données MySQL

```sql
-- Dans MySQL Workbench ou la console MySQL :
CREATE DATABASE pharmagest_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 Installer les dépendances Python

```bash
cd pharma-backend
python -m venv venv
venv\Scripts\activate        # Windows
# ou : source venv/bin/activate  (Linux/Mac)

pip install -r requirements.txt
```

### 2.3 Configurer les variables d'environnement

Modifier le fichier `.env` à la racine de `pharma-backend/` :

```env
SECRET_KEY=django-insecure-votre-cle-secrete
DEBUG=True
DB_NAME=pharmagest_db
DB_USER=root
DB_PASSWORD=VOTRE_MOT_DE_PASSE_MYSQL
DB_HOST=localhost
DB_PORT=3306
```

### 2.4 Appliquer les migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 2.5 Créer un superutilisateur admin

```bash
python manage.py createsuperuser
# Entrer : username, email, password
```

### 2.6 Lancer le serveur Django

```bash
python manage.py runserver
# Serveur disponible sur http://localhost:8000
# Admin : http://localhost:8000/admin/
```

---

## 3. Frontend React

```bash
cd pharma-frontend
npm install
npm run dev
# Application disponible sur http://localhost:5173
```

---

## 4. Structure du projet

```
pharmagest/
├── pharma-backend/
│   ├── apps/
│   │   ├── users/          # Authentification JWT + rôles
│   │   ├── medicaments/    # CRUD médicaments, catégories, fournisseurs
│   │   ├── stocks/         # Mouvements de stock, alertes
│   │   ├── ventes/         # Ventes, lignes de vente, export CSV
│   │   └── dashboard/      # KPIs et statistiques
│   ├── config/             # Settings, URLs, WSGI
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
│
└── pharma-frontend/
    ├── src/
    │   ├── components/     # Layout, composants réutilisables
    │   ├── context/        # AuthContext (JWT)
    │   ├── pages/          # Dashboard, Médicaments, Stocks, Ventes, Alertes
    │   ├── services/       # api.js — Axios + intercepteurs
    │   └── utils/          # formatters.js (FCFA, dates, badges)
    ├── package.json
    └── vite.config.js
```

---

## 5. Endpoints API principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login/` | Connexion (JWT) |
| POST | `/api/auth/refresh/` | Rafraîchir le token |
| GET/POST | `/api/medicaments/` | Liste / créer médicament |
| GET/PUT/DELETE | `/api/medicaments/{id}/` | Détail médicament |
| GET | `/api/medicaments/alertes/` | Alertes stock et péremption |
| GET/POST | `/api/stocks/mouvements/` | Historique des mouvements |
| GET/POST | `/api/ventes/` | Liste / enregistrer une vente |
| GET | `/api/ventes/export/csv/` | Export CSV |
| GET | `/api/dashboard/stats/` | KPIs du tableau de bord |

---

## 6. Comptes de test

Après `createsuperuser` :

| Rôle | Username | Mot de passe |
|------|----------|-------------|
| Administrateur | admin | (défini lors du createsuperuser) |

---

## 7. Fonctionnalités

- **Authentification JWT** avec rôles (admin, pharmacien, caissier)
- **Gestion des médicaments** : CRUD complet, catégories, fournisseurs, dosage, numéro de lot
- **Gestion des stocks** : entrées/sorties, ajustements, historique complet
- **Alertes automatiques** : rupture de stock, stock critique, péremption proche (J-7, J-30), médicaments périmés
- **Module ventes** : enregistrement avec déduction automatique du stock, Mobile Money (MTN/Orange)
- **Dashboard** : KPIs temps réel, graphiques Recharts, export CSV
- **Devise** : Franc CFA (FCFA), fuseau horaire Africa/Douala
