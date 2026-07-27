# api/

Ce dossier est réservé aux futures **fonctions serverless Vercel** (si vous en ajoutez).

## État actuel : vide, intentionnellement

Le projet MbeukChurch actuel n'utilise **aucune fonction serverless Vercel**. Tout le
backend passe directement par **Supabase** (authentification, licences, et — si vous avez
appliqué le skill Cloud Central — les Edge Functions Supabase `api-proxy` et
`admin-actions`), appelé directement depuis le frontend via `fetch()`.

Les **Edge Functions Supabase** (dossier séparé `cloud-central-deliverables/edge-functions/`
livré précédemment) sont différentes des fonctions Vercel : elles tournent sur
l'infrastructure Deno de Supabase, pas sur Vercel, et se déploient via `supabase functions
deploy`, pas via ce dossier `api/`.

## Si vous ajoutez des fonctions Vercel plus tard

Vercel détecte automatiquement tout fichier placé ici (`api/nom.js` → route
`/api/nom`) et le déploie comme fonction serverless — aucune configuration
supplémentaire n'est nécessaire côté `vite.config.js`. Voir la documentation
Vercel : https://vercel.com/docs/functions
