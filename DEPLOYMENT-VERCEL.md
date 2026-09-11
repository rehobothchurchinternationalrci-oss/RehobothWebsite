# Déploiement sur Vercel

Alternative à [DEPLOYMENT.md](DEPLOYMENT.md) (Railway). Les fichiers de
configuration des deux plateformes cohabitent sans interférer : Vercel ne lit
que `vercel.json`, Railway que `railway.toml` / `railway.json`.

> ⚠️ **Le chemin Railway du frontend est actuellement cassé.**
> `frontend/nginx.conf.template` a été supprimé, alors que `frontend/Dockerfile`
> le copie toujours (ligne 29) : le build Docker échouerait. Deux sorties, au
> choix — supprimer `frontend/Dockerfile` et `frontend/railway.json` si Railway
> est abandonné pour le frontend, ou restaurer le template
> (`git checkout 20e5013^ -- frontend/nginx.conf.template`) pour garder
> Railway en repli. Le **backend** sur Railway, lui, reste intact.

Le dépôt est un monorepo. Il se déploie en **deux projets Vercel** distincts,
construits depuis le même repo GitHub mais avec un *Root Directory* différent :

| Projet     | Root Directory | Type                        | Config                |
| ---------- | -------------- | --------------------------- | --------------------- |
| `backend`  | `backend`      | Fonction serverless Python  | `backend/vercel.json` |
| `frontend` | `frontend`     | Site statique (Vite)        | `frontend/vercel.json`|

La base reste sur **Supabase**. Les fichiers uploadés partent dans Supabase
Storage — indispensable ici : le système de fichiers d'une fonction serverless
est éphémère et en lecture seule.

> ⚠️ **Lisez d'abord la section « Ce que le serverless change »** en fin de
> document. Le passage de gunicorn à Vercel a une conséquence concrète sur la
> protection anti-bruteforce, qui demande une action de votre part.

---

## 0. Avant le premier déploiement

Le travail côté Supabase est identique à Railway : schéma, migrations `001` →
`009`, buckets Storage, premier administrateur. Voir la
[section 0 de DEPLOYMENT.md](DEPLOYMENT.md#0-avant-le-premier-déploiement) —
rien ne change.

---

## 1. Projet backend

1. Vercel → **Add New… → Project** → importer le dépôt GitHub.
2. **Root Directory** : `backend`.
3. **Framework Preset** : *Other*. Ne pas renseigner de Build Command : il n'y
   a rien à compiler, Vercel installe `requirements.txt` et empaquette la
   fonction.
4. Dans **Settings → Environment Variables**, pour l'environnement *Production*
   (cf. [backend/.env.example](backend/.env.example)) :

   ```text
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<clé service_role>
   FLASK_ENV=production
   FRONTEND_URL=https://<frontend>.vercel.app
   CORS_ORIGINS=https://<frontend>.vercel.app
   RESEND_API_KEY=<clé Resend>
   RESEND_FROM_EMAIL=noreply@votre-domaine.org
   CHURCH_CONTACT_EMAIL=contact@votre-domaine.org
   RATELIMIT_STORAGE_URI=<voir section « Ce que le serverless change »>
   ```

   > Ne **pas** définir `PORT` : la notion n'existe pas en serverless.
   > `GUNICORN_*` ne sert à rien non plus ici, gunicorn n'est pas utilisé.

### Pourquoi pip et non uv

Vercel choisit son installateur d'après les fichiers trouvés à la racine du
projet : avec un `pyproject.toml`, il lance `uv sync --locked` ; sinon il
installe `requirements.txt` avec pip.

Le premier chemin échoue ici :

```text
Warning: Python version "3.11" detected in backend/.python-version
         is not installed and will be ignored.
Using python version: 3.12
error: No interpreter found for Python 3.11 in managed installations
```

`.python-version` demande 3.11, absent de l'image de build (qui fournit 3.12).
Vercel l'ignore pour son propre choix, mais uv le lit et refuse de continuer.
Et même corrigé, `uv sync --locked` exigerait `uv.lock`, que
[`.vercelignore`](backend/.vercelignore) écarte du paquet.

[`backend/.vercelignore`](backend/.vercelignore) écarte donc `pyproject.toml`,
`uv.lock` et `.python-version` : Vercel retombe sur `requirements.txt` + pip,
en Python 3.12. C'est déjà la référence du déploiement — Railway/Nixpacks
installe depuis ce fichier, et `pyproject.toml` indique lui-même devoir rester
aligné dessus. **Le développement local n'est pas touché** : uv continue d'y
lire `pyproject.toml` et `.python-version` normalement.

> Si vous ajoutez une dépendance, mettez à jour **`requirements.txt`** en plus
> de `pyproject.toml`, sinon elle manquera en production — sur Vercel comme
> sur Railway.

### Comment ça s'articule

[`backend/api/index.py`](backend/api/index.py) est un adaptateur de six lignes
utiles : il ajoute le dossier parent au `sys.path` puis réexporte l'application
de `app.py`. Le runtime Python de Vercel repère la variable `app` (WSGI) et lui
transmet la requête.

La réécriture de [`backend/vercel.json`](backend/vercel.json) envoie **toutes**
les URL vers cette fonction, en conservant le chemin d'origine — Flask route
ensuite `/api/health`, `/api/membres`, `/static/logo.jpeg` comme d'habitude.

`app.py` reste donc la source unique : gunicorn en local et Vercel démarrent
exactement la même application.

---

## 2. Projet frontend

1. Vercel → **Add New… → Project** → **le même dépôt**.
2. **Root Directory** : `frontend`.
3. Framework, build et sortie sont déjà décrits dans
   [`frontend/vercel.json`](frontend/vercel.json) — Vercel les reprend seul.
4. **Environment Variables** :

   ```text
   VITE_API_BASE_URL=https://<backend>.vercel.app/api
   VITE_APP_VERSION=1.0.0
   ```

   ⚠️ **Vite fige les variables `VITE_*` au moment du build**, pas au runtime.
   Les définir *avant* le premier déploiement ; toute modification impose un
   **redeploy**, pas un simple restart.

   Ne pas oublier le suffixe `/api`.

Le `vercel.json` du frontend reprend ce que faisait nginx sur Railway :

- **Réécriture SPA** — toute route inconnue renvoie `index.html`, nécessaire à
  react-router. Les fichiers réellement présents (`/assets/…`, `/favicon.svg`,
  `/manifest.json`) sont servis avant que la réécriture s'applique.
- **En-têtes de sécurité** — `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, portés depuis `nginx.conf.template`.
  Sans ce report, ils auraient disparu en passant à Vercel.
- **Cache** — un an immuable sur `/assets/` (noms hashés par Vite), `no-store`
  sur `index.html` pour qu'un déploiement ne continue pas à servir l'ancien
  bundle.

La sonde `/healthz` de nginx n'a pas d'équivalent : Vercel ne fait pas de
healthcheck sur un site statique. Elle n'est pas reportée.

---

## 3. Boucler la configuration CORS

Les deux projets ont des domaines différents, donc le navigateur applique le
CORS. Une fois le domaine du frontend connu, revenir sur le projet **backend** :

```text
CORS_ORIGINS=https://<frontend>.vercel.app
FRONTEND_URL=https://<frontend>.vercel.app
```

Puis **redéployer le backend** pour que les nouvelles variables prennent effet.

Plusieurs origines se séparent par des virgules :

```text
CORS_ORIGINS=https://rehoboth.vercel.app,https://www.rehoboth.org
```

> **Attention aux URL de preview.** Vercel crée un domaine unique par branche
> et par commit (`<projet>-<hash>-<org>.vercel.app`). Ces domaines ne sont pas
> dans `CORS_ORIGINS` : les previews du frontend appelleront l'API de
> production et seront bloquées. C'est le comportement souhaitable — ne mettez
> pas de joker `*.vercel.app`, cela autoriserait n'importe quel projet Vercel
> du monde à appeler votre API.

### Option : supprimer le CORS entièrement

Ajouter une réécriture dans `frontend/vercel.json` :

```json
{ "source": "/api/:chemin*", "destination": "https://<backend>.vercel.app/api/:chemin*" }
```

puis poser `VITE_API_BASE_URL=/api`. Le navigateur ne voit plus qu'une seule
origine, le CORS disparaît et les previews fonctionnent. Coût : un aller-retour
supplémentaire par requête. À considérer si les previews vous sont utiles.

---

## 4. Vérification après déploiement

```bash
# Backend en vie (liveness)
curl https://<backend>.vercel.app/api/health
# → {"status":"healthy","environment":"production"}

# Backend prêt (readiness : config + Supabase)
curl https://<backend>.vercel.app/api/health/ready
# → {"status":"healthy","checks":{...}}

# Fichier statique servi par Flask (utilisé dans les emails)
curl -I https://<backend>.vercel.app/static/logo.jpeg
# → 200, Content-Type: image/jpeg

# Frontend servi
curl -I https://<frontend>.vercel.app/
# → 200

# Fallback SPA sur une route profonde
curl -I https://<frontend>.vercel.app/dashboard/membres
# → 200 (et non 404)

# En-têtes de sécurité présents
curl -sI https://<frontend>.vercel.app/ | grep -i "x-content-type\|x-frame\|referrer"
```

Puis, dans le navigateur, ouvrir le site et vérifier dans l'onglet *Network*
que les requêtes partent vers le domaine du backend, sans erreur CORS.

---

## Ordre de déploiement recommandé

1. Déployer le **backend**, noter son domaine.
2. Déployer le **frontend** avec `VITE_API_BASE_URL` pointant dessus.
3. Mettre `CORS_ORIGINS` et `FRONTEND_URL` du backend sur le domaine du
   frontend → **redéployer le backend**.

---

## Ce que le serverless change

Sur Railway, le backend est un processus gunicorn qui tourne en continu. Sur
Vercel, chaque requête réveille une fonction éphémère. Quatre conséquences.

### 1. Le rate limiting ne protège plus — action requise

C'est le point important. Cinq routes sont protégées par `flask-limiter` :

| Route | Limite | Ce qu'elle protège |
| --- | --- | --- |
| `POST /api/auth/login` | 10/min, 50/h | bruteforce de mots de passe |
| réinitialisation de mot de passe | 5/h | spam de mails de reset |
| `POST /api/auth/upload` | 30/h | saturation du Storage |
| formulaire de contact public | 3/h, 10/j | spam, épuisement du quota Resend |
| espace département | 5/h, 20/j | envois en masse |

Avec le stockage par défaut `memory://`, les compteurs vivent **dans la mémoire
de l'instance**. Vercel crée et détruit ces instances librement et en exécute
plusieurs en parallèle : chaque instance repart de zéro, et un attaquant
réparti sur N instances obtient N fois la limite. Sur Railway le problème
existait déjà entre workers gunicorn, mais à une échelle bien moindre — deux
workers stables contre un nombre d'instances imprévisible.

**Concrètement, ces cinq protections deviennent décoratives.** Le correctif ne
demande aucun changement de code, la variable est déjà prise en charge :

1. Vercel → **Storage → Create Database → Upstash Redis** (offre gratuite
   suffisante pour cet usage).
2. Copier l'URL de connexion `redis://…` ou `rediss://…`.
3. Poser `RATELIMIT_STORAGE_URI=rediss://…` sur le projet backend, puis
   redéployer.

Les compteurs deviennent alors partagés et exacts, quel que soit le nombre
d'instances.

### 2. Démarrages à froid

Après une période d'inactivité, la première requête paie l'import de Flask et
du client Supabase — comptez une à trois secondes. Les suivantes sont rapides.
Le client Supabase est déjà initialisé paresseusement (`extensions.py`), ce qui
limite la casse. Rien à faire, mais ne vous inquiétez pas d'un premier appel
lent le matin.

### 3. Durée maximale d'exécution

Une fonction est coupée au bout d'un temps borné par votre offre. Les routes
qui envoient un mail à tous les membres d'un département sont les plus
exposées. En cas de coupure, relever la limite dans `backend/vercel.json` :

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api/index" }],
  "functions": { "api/index.py": { "maxDuration": 60 } }
}
```

Volontairement absent par défaut : demander une durée supérieure à ce que
permet votre offre fait **échouer le déploiement**. À n'ajouter qu'en cas de
besoin constaté, avec une valeur que votre plan autorise.

### 4. Poids du paquet

`requirements.txt` embarque `gunicorn` et `pytest`, inutiles sur Vercel mais
nécessaires pour Railway et les tests. Ils sont installés pour rien et
alourdissent un peu le démarrage à froid. Pas assez pour justifier deux
fichiers de dépendances divergents — à surveiller seulement si le paquet
approche la limite de taille.

[`backend/.vercelignore`](backend/.vercelignore) écarte déjà le gros du superflu
(environnements virtuels, tests, notebook, dossier Alembic inerte, scripts SQL).
`static/` est **volontairement conservé** : Flask y sert `logo.jpeg`, utilisé
dans les emails.

---

## Développement local

Inchangé — ni Vercel ni Railway n'interviennent :

```bash
# Backend
cd backend && cp .env.example .env   # puis remplir les valeurs
python app.py                        # http://localhost:5000

# Frontend
cd frontend && cp .env.example .env
npm install && npm run dev           # http://localhost:5173
```
