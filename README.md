# Pronostics CM 2026

## Démarrage local

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Créer la base de données locale
npm run db:push

# 4. Lancer le serveur de développement
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | `file:./dev.db` en local, URL Turso en prod |
| `TURSO_AUTH_TOKEN` | Token Turso (prod uniquement) |
| `FOOTBALL_DATA_API_KEY` | Clé API football-data.org |

## Déploiement (Vercel)

1. Push sur GitHub
2. Importer le repo sur [vercel.com](https://vercel.com)
3. Renseigner les variables d'environnement dans les settings Vercel
4. Déployer
