# Guide de déploiement — Planning Thionville

Ce projet a été reconstruit pour être **totalement indépendant de Manus**. Tu contrôles
maintenant ta base de données, ton backend, et ton code source.

Résumé du changement : la connexion se fait désormais par un **code d'accès** propre à
chaque salarié (généré et géré par l'admin, dans l'app elle-même), au lieu d'un compte
Manus. Le bug de connexion est donc réglé — mais il faut redéployer avant de pouvoir
t'en servir, puisque l'ancien backend Manus n'existe plus.

---

## Vue d'ensemble

1. **Base de données** → Supabase (gratuit)
2. **Backend (API)** → Render (gratuit)
3. **Application mobile** → rebuild avec EAS puis republication

---

## Étape 1 — Créer la base de données (Supabase)

1. Va sur https://supabase.com et crée un compte (gratuit).
2. Crée un nouveau projet (choisis une région proche, ex. Europe).
3. Note bien le **mot de passe de la base de données** que tu choisis à la création.
4. Une fois le projet créé, va dans **Project Settings → Database → Connection string**
   et copie l'URI au format `URI` (commence par `postgresql://postgres:...`).
   → C'est ta valeur de `DATABASE_URL`.

## Étape 2 — Générer une clé secrète (JWT_SECRET)

Sur ton ordinateur, ouvre un terminal et lance :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copie la valeur générée, ce sera ton `JWT_SECRET`. Garde-la précieusement, ne la partage
avec personne — c'est elle qui sécurise les connexions.

## Étape 3 — Déployer le backend (Render)

1. Mets le code de ce projet sur un dépôt GitHub (crée un repo, `git init`, `git add .`,
   `git commit`, `git push`).
2. Va sur https://render.com, crée un compte, puis **New → Web Service**.
3. Connecte ton dépôt GitHub.
4. Configure :
   - **Build Command** : `pnpm install && pnpm build`
   - **Start Command** : `pnpm start`
5. Dans l'onglet **Environment**, ajoute les variables :
   - `DATABASE_URL` → celle de Supabase (étape 1)
   - `JWT_SECRET` → celle générée (étape 2)
   - `NODE_ENV` → `production`
6. Déploie. Une fois en ligne, Render te donne une URL du type
   `https://planning-thionville-api.onrender.com` → **note-la**, c'est ton URL d'API.

⚠️ Le plan gratuit de Render met le service en veille après 15 minutes d'inactivité : le
premier appel après une pause peut prendre ~30 secondes. C'est normal, pas un bug.

## Étape 4 — Initialiser les tables de la base de données

En local, sur ton ordinateur, dans le dossier du projet :

```bash
pnpm install
echo "DATABASE_URL=<ton URL Supabase>" > .env
pnpm db:push
```

Cela crée les tables (`staff_members`, `planning_weeks`, `shifts`, etc.) dans Supabase.

## Étape 5 — Créer le tout premier compte administrateur

En local, dans le dossier du projet (avec le `.env` créé à l'étape 4) :

```bash
pnpm tsx scripts/create-admin.ts "Ton Nom" "MON-CODE-SECRET"
```

Remplace `"MON-CODE-SECRET"` par le code que tu veux utiliser pour te connecter en tant
qu'admin (majuscules, sans espaces, garde-le précieusement). Ce script crée directement
la ligne en base avec le bon hachage — pas besoin de manipuler Supabase à la main.

Une fois connecté en tant qu'admin dans l'app, tu pourras créer tous les autres salariés
directement depuis l'interface (bouton "Ajouter" dans la gestion des salariés) — leurs
codes seront générés et affichés automatiquement.

## Étape 6 — Rebuilder l'application mobile

1. Dans `eas.json`, remplace `https://VOTRE-BACKEND.onrender.com` par ta vraie URL Render
   (étape 3), dans les deux profils `preview` et `production`.
2. Installe EAS CLI si besoin : `npm install -g eas-cli`
3. Connecte-toi : `eas login` (utilise ton compte Expo existant, `hakim...`)
4. Lance le build :

```bash
eas build --platform android --profile preview
```

5. Une fois terminé, EAS te donne un lien pour télécharger le nouvel APK.

## Étape 7 — Publier

- **Test interne / distribution directe** : partage simplement l'APK généré (comme
  avant).
- **Google Play Store** : utilise `eas build --profile production` (génère un `.aab`)
  puis `eas submit` pour l'envoyer sur la Play Console.

---

## En cas de souci

- Erreur de connexion à la base de données → vérifie que `DATABASE_URL` est bien copié
  entièrement, mot de passe inclus, et que le projet Supabase est actif (pas en pause).
- L'app affiche toujours "Accès refusé" → vérifie que le compte admin a bien
  `active = true` et que le code saisi correspond exactement à celui utilisé pour générer
  le `codeHash`.
- Toute autre erreur : renvoie-moi le message exact, je t'aide à la résoudre.
