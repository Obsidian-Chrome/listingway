# Configuration du Cloudflare Worker pour le proxy CORS

## Pourquoi ?

Les proxies CORS publics (corsproxy.io, allorigins.win) sont peu fiables et bloquent souvent les requêtes.
Un Cloudflare Worker est gratuit, rapide et fiable.

## Étapes de déploiement

### 1. Créer un compte Cloudflare (gratuit)

- Aller sur https://dash.cloudflare.com/sign-up
- Créer un compte gratuit

### 2. Créer un Worker

1. Aller dans **Workers & Pages** dans le menu de gauche
2. Cliquer sur **Create application**
3. Cliquer sur **Create Worker**
4. Donner un nom comme `universalis-proxy`
5. Cliquer sur **Deploy**

### 3. Configurer le Worker

1. Une fois déployé, cliquer sur **Edit code**
2. Supprimer le code par défaut
3. Copier-coller le contenu de `cloudflare-worker-proxy.js`
4. Cliquer sur **Save and Deploy**

### 4. Obtenir l'URL du Worker

L'URL sera du type : `https://universalis-proxy.VOTRE-SUBDOMAIN.workers.dev`

### 5. Mettre à jour le code

Dans `src/utils/api.js`, remplacer la ligne :

```javascript
const UNIVERSALIS_API = 'https://universalis.app/api/v2'
```

Par :

```javascript
const UNIVERSALIS_API = 'https://universalis.app/api/v2'
const CORS_PROXY = 'https://universalis-proxy.VOTRE-SUBDOMAIN.workers.dev/?url='
```

Et dans `fetchPricesFromDatacenters`, remplacer :

```javascript
const priceUrl = `${UNIVERSALIS_API}/${dc}/${itemId}`
const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(priceUrl)}`
const priceResponse = await fetch(proxiedUrl)

if (!priceResponse.ok) continue

const proxyData = await priceResponse.json()
const priceData = JSON.parse(proxyData.contents)
```

Par :

```javascript
const priceUrl = `${UNIVERSALIS_API}/${dc}/${itemId}`
const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(priceUrl)}`
const priceResponse = await fetch(proxiedUrl)

if (!priceResponse.ok) continue

const priceData = await priceResponse.json()
```

### 6. Redéployer le site

```bash
npm run build
git add .
git commit -m "Use Cloudflare Worker CORS proxy"
git push
```

## Avantages

✅ Gratuit (100,000 requêtes/jour)
✅ Très rapide (edge network mondial)
✅ Fiable et stable
✅ Pas de timeout
✅ Cache intégré (5 minutes)

## Alternative : Proxy local seulement

Si vous ne voulez pas utiliser Cloudflare Worker, vous pouvez aussi simplement utiliser l'application en local uniquement :

```bash
npm run dev
```

Le CORS ne pose problème que sur GitHub Pages, pas en local.
