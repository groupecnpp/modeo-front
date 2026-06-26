# Modeo — Frontend

Interface web React/Vite qui sert de tableau de bord à l'extension **Modeo**. Le frontend n'est pas autonome : il communique avec l'extension via un bridge `postMessage` pour lire et écrire les modes opératoires stockés dans l'IndexedDB de l'extension.

## Prérequis

- Node.js 18+
- L'extension Chrome Modeo installée et activée dans le navigateur
- L'URL du frontend configurée dans le panneau de l'extension (champ « Frontend origin »)

## Stack

- React 19 + React Router 7
- Vite 6
- TypeScript
- Stockage : IndexedDB de l'extension (via bridge postMessage)

---

## Installation

```bash
cd frontend
npm install
```

---

## Développement local

```bash
npm run dev
```

Le frontend démarre sur `http://localhost:5173` par défaut.

> Dans le panneau de l'extension, renseigne `http://localhost:5173` comme **Frontend origin** pour que le bridge accepte les messages de cette origine.

---

## Build de production

```bash
npm run build
```

Les fichiers compilés sont générés dans `frontend/dist/`.

Pour prévisualiser le build localement :

```bash
npm run preview
```

---

## Déploiement

Le frontend est une SPA statique : dépose le contenu de `dist/` sur n'importe quel hébergeur de fichiers statiques.

### Exemple avec XAMPP (local)

1. Copie le contenu de `dist/` dans `htdocs/modeo-frontend/` (ou tout autre dossier servi par Apache).
2. Ajoute un fichier `.htaccess` pour que React Router fonctionne correctement :

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

3. Accède au frontend via `http://localhost/modeo-frontend/`.
4. Dans le panneau de l'extension, configure le **Frontend origin** à `http://localhost/modeo-frontend`.

### Exemple avec un serveur Nginx

```nginx
server {
    listen 80;
    server_name modeo.example.com;
    root /var/www/modeo-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> La directive `try_files` est indispensable pour que la navigation client-side (React Router) fonctionne après un refresh.

---

## Configuration de l'extension

Une fois le frontend déployé, ouvre le panneau latéral de l'extension et renseigne l'URL complète du frontend dans le champ **Frontend origin** (ex. `https://modeo.example.com`). Sans cette configuration, le bridge postMessage rejettera toutes les requêtes du frontend.

---

## Lint

```bash
npm run lint
```
