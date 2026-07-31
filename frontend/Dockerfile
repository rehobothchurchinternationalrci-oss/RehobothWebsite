# ---------- Etape 1 : build du bundle Vite ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite fige les variables VITE_* au moment du build : elles doivent donc etre
# fournies ici (Railway transmet les variables du service comme build args).
ARG VITE_API_BASE_URL
ARG VITE_APP_VERSION=1.0.0
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# ---------- Etape 2 : service des fichiers statiques ----------
FROM nginx:1.27-alpine

# nginx applique envsubst sur les fichiers de /etc/nginx/templates au demarrage,
# ce qui permet d'ecouter sur le PORT injecte par Railway.
ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER="PORT"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080
