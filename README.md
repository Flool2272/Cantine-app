# Cantine — application d'inscription

Remplace le classeur Excel d'inscription à la cantine par une petite application web :

- chaque **employé** s'inscrit en un clic, jour par jour (nom + code personnel, pas de compte à créer) ;
- le **prestataire** saisit chaque jour le nombre réel de repas servis ;
- un **tableau de bord** compare inscrits (théorique) et présents (réel), avec le taux de présence ;
- une **relance automatique dans Teams**, chaque matin en semaine, liste combien de personnes n'ont pas encore confirmé leur présence.

Stack : Next.js (TypeScript) + PostgreSQL (Neon), déployée sur Render.

## 1. Créer la base de données (Neon)

1. Créez un compte sur [neon.tech](https://neon.tech) (gratuit) et un nouveau projet.
2. Dans le dashboard du projet, copiez la **Connection string** (elle ressemble à
   `postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`).
   Vous n'avez rien d'autre à faire : les tables sont créées automatiquement au premier démarrage de l'application.

## 2. Pousser le code sur GitHub

Depuis ce dossier :

```bash
git init
git add .
git commit -m "Application cantine"
git branch -M main
git remote add origin https://github.com/<votre-compte>/cantine-app.git
git push -u origin main
```

(Créez au préalable un dépôt vide `cantine-app` sur GitHub.)

## 3. Déployer sur Render

1. Sur [render.com](https://render.com), **New > Blueprint**, sélectionnez le dépôt GitHub `cantine-app`.
   Render lit automatiquement `render.yaml` et propose de créer :
   - le service web `cantine-app` ;
   - le cron job `cantine-reminder` (relance Teams quotidienne).
2. Renseignez les variables d'environnement demandées (voir détail ci-dessous), puis lancez le déploiement.
3. Une fois le service web déployé, notez son URL publique (ex. `https://cantine-app.onrender.com`) et
   reportez-la dans la variable `APP_URL` des **deux** services (web + cron), puis redéployez.

### Variables d'environnement

| Variable | Où la trouver | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Connection string Neon (étape 1) | Oui |
| `JWT_SECRET` | Générée automatiquement par Render (`generateValue: true`) | Oui |
| `CRON_SECRET` | Générée automatiquement par Render, partagée entre le service web et le cron | Oui |
| `TEAMS_WEBHOOK_URL` | Voir étape 4 | Oui pour activer les relances |
| `APP_URL` | URL Render du service web, une fois connue | Oui |
| `ADMIN_BOOTSTRAP_NAME` / `ADMIN_BOOTSTRAP_CODE` | Choisissez un nom et un code — crée le 1er compte admin au démarrage | Recommandé |
| `PROVIDER_BOOTSTRAP_NAME` / `PROVIDER_BOOTSTRAP_CODE` | Choisissez un nom et un code — crée le compte prestataire au démarrage | Recommandé |

Les comptes bootstrap ne sont créés que si leur table est vide : changez le code ensuite depuis l'application
(à ajouter côté admin si besoin) ou directement en base.

## 4. Créer le webhook Teams

Deux options, au choix :

- **Connecteur "Webhook entrant" (simple)** : dans le canal Teams concerné → `...` → Connecteurs →
  "Webhook entrant" → configurez un nom/icône → copiez l'URL générée dans `TEAMS_WEBHOOK_URL`.
- **Power Automate** : créez un flux déclenché par *"Lorsqu'une requête webhook Teams est reçue"*, qui poste
  le champ `text` reçu dans le canal. Utilisez l'URL de déclenchement du flux comme `TEAMS_WEBHOOK_URL`.

L'application envoie un simple `{"text": "..."}` en POST, compatible avec les deux approches.

## 5. Premier lancement

1. Connectez-vous en **Admin** avec `ADMIN_BOOTSTRAP_NAME` / `ADMIN_BOOTSTRAP_CODE`.
2. Allez dans **Employés**, collez la liste `Nom;Prénom` (une ligne par personne) et importez.
   Les codes personnels générés s'affichent **une seule fois** : téléchargez le CSV et distribuez les codes
   (courrier interne, affichage RH...).
3. Connectez-vous en **Prestataire** avec `PROVIDER_BOOTSTRAP_NAME` / `PROVIDER_BOOTSTRAP_CODE` pour saisir
   chaque jour le nombre réel de repas servis.
4. Le **Tableau de bord** (Admin ou Prestataire) affiche le taux de présence réelle par rapport aux inscrits.

## Développement local

Cette machine ne dispose pas de Node.js installé ; le code est écrit pour être buildé/testé directement par
Render. Si vous voulez itérer en local, installez Node.js 20+, puis :

```bash
npm install
cp .env.example .env.local   # renseignez au moins DATABASE_URL et JWT_SECRET
npm run dev
```

## Notes

- Les jours de week-end sont exclus partout (inscriptions, tableau de bord, relance).
- L'heure de la relance (`schedule` dans `render.yaml`, en UTC) correspond à 9h-10h heure de Paris selon
  l'heure d'été/hiver ; ajustez si besoin depuis le dashboard Render (service `cantine-reminder`).
- Les codes personnels sont stockés hachés (bcrypt), jamais en clair en base.
