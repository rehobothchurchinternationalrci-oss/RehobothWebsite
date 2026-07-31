# Déploiement sur Railway

Le dépôt est un monorepo. Il se déploie en **deux services Railway** distincts,
tous deux construits à partir du même repo GitHub mais avec un *Root Directory*
différent :

| Service    | Root Directory | Build      | Port    | Healthcheck    |
| ---------- | -------------- | ---------- | ------- | -------------- |
| `backend`  | `backend`      | Dockerfile | `$PORT` | `/api/health`  |
| `frontend` | `frontend`     | Dockerfile | `$PORT` | `/healthz`     |

La base de données reste sur **Supabase** — rien à provisionner côté Railway.
Les fichiers uploadés partent dans Supabase Storage, donc aucun volume
persistant n'est nécessaire.

---

## 1. Service backend

1. Railway → **New Project** → *Deploy from GitHub repo* → sélectionner ce dépôt.
2. Dans **Settings** du service :
   - *Root Directory* : `backend`
   - *Builder* : Dockerfile (détecté automatiquement via `backend/railway.json`)
3. Dans **Variables**, renseigner (cf. [backend/.env.example](backend/.env.example)) :

   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<clé service_role>
   FLASK_ENV=production
   CORS_ORIGINS=https://<frontend>.up.railway.app
   RESEND_API_KEY=<clé Resend>
   RESEND_FROM_EMAIL=noreply@votre-domaine.org
   CHURCH_CONTACT_EMAIL=contact@votre-domaine.org
   ```

   > Ne **pas** définir `PORT` : Railway l'injecte lui-même et le Dockerfile
   > s'y adapte.

4. **Settings → Networking → Generate Domain** pour obtenir l'URL publique.

Le démarrage échoue volontairement (`Config.validate()`) si `SUPABASE_URL` ou
`SUPABASE_SERVICE_ROLE_KEY` manquent — c'est visible immédiatement dans les logs.

### Réglages Gunicorn (optionnels)

`GUNICORN_WORKERS` (défaut `2`), `GUNICORN_THREADS` (`4`),
`GUNICORN_TIMEOUT` (`120`). À augmenter seulement si le plan Railway offre
plus de CPU/RAM.

---

## 2. Service frontend

1. Dans le **même projet** Railway → **New** → *GitHub Repo* → le même dépôt.
2. Dans **Settings** :
   - *Root Directory* : `frontend`
   - *Builder* : Dockerfile
3. Dans **Variables** :

   ```
   VITE_API_BASE_URL=https://<backend>.up.railway.app/api
   VITE_APP_VERSION=1.0.0
   ```

   ⚠️ **Vite fige les variables `VITE_*` au moment du build**, pas au runtime.
   Elles doivent donc exister *avant* le build — le Dockerfile les reçoit comme
   build args. Toute modification de `VITE_API_BASE_URL` impose un **redeploy**,
   pas un simple restart.

   Ne pas oublier le suffixe `/api` : le backend expose ses routes sous ce préfixe.

4. **Generate Domain** pour l'URL publique du site.

nginx sert le bundle statique et renvoie toutes les routes inconnues vers
`index.html` (nécessaire pour react-router).

---

## 3. Boucler la configuration CORS

Une fois le domaine du frontend connu, revenir sur le service **backend** et
mettre `CORS_ORIGINS` à jour :

```
CORS_ORIGINS=https://<frontend>.up.railway.app
```

Plusieurs origines se séparent par des virgules (utile pour ajouter un domaine
personnalisé) :

```
CORS_ORIGINS=https://rehoboth.up.railway.app,https://www.rehoboth.org
```

Laisser `*` fonctionne mais ouvre l'API à n'importe quel site — à éviter en
production.

---

## 4. Vérification après déploiement

```bash
# Backend en vie
curl https://<backend>.up.railway.app/api/health
# → {"status":"healthy","environment":"production"}

# Frontend servi
curl -I https://<frontend>.up.railway.app/
# → 200

# Fallback SPA sur une route profonde
curl -I https://<frontend>.up.railway.app/dashboard/membres
# → 200 (et non 404)
```

Puis, dans le navigateur, ouvrir le site et vérifier dans l'onglet *Network*
que les requêtes partent bien vers le domaine du backend, sans erreur CORS.

---

## Ordre de déploiement recommandé

1. Déployer le **backend**, générer son domaine.
2. Déployer le **frontend** avec `VITE_API_BASE_URL` pointant sur ce domaine.
3. Mettre `CORS_ORIGINS` du backend sur le domaine du frontend → redeploy backend.

---

## Développement local

Rien ne change :

```bash
# Backend
cd backend && cp .env.example .env   # puis remplir les valeurs
python app.py                        # http://localhost:5000

# Frontend
cd frontend && cp .env.example .env.local
npm install && npm run dev           # http://localhost:5173
```
