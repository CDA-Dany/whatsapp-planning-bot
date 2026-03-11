# 🤖 Bot WhatsApp Planning avec Claude AI

Bot intelligent qui analyse les messages d'un groupe WhatsApp pour gérer automatiquement le planning d'un chantier.

## 📋 Architecture

```
Message WhatsApp
    ↓
Bot (whatsapp-web.js)
    ↓
Claude API (analyse)
    ↓
Firestore (sauvegarde)
    ↓
Site Web (affichage temps réel)
```

---

## 🚀 Installation locale

### **Prérequis**

1. **Node.js** (version 18+)
   - Télécharger : https://nodejs.org/
   - Vérifier : `node --version`

2. **Compte Anthropic** (Claude API)
   - Créer compte : https://console.anthropic.com/
   - Récupérer clé API (5$ gratuit)

3. **Compte Firebase** (déjà configuré)
   - Service Account pour Firebase Admin

---

### **Étape 1 : Télécharger le projet**

```bash
# Naviguer vers le dossier du bot
cd whatsapp-bot

# Installer les dépendances
npm install
```

---

### **Étape 2 : Configuration Firebase Admin**

1. **Console Firebase** : https://console.firebase.google.com
2. **Projet** : metre-bet-3dcb1
3. **Paramètres du projet** (roue crantée) → **Comptes de service**
4. **Générer une nouvelle clé privée** → Télécharger le fichier JSON
5. Ouvrir le fichier JSON et copier :
   - `project_id`
   - `private_key`
   - `client_email`

---

### **Étape 3 : Configuration des variables**

1. Copier `.env.example` vers `.env` :
   ```bash
   cp .env.example .env
   ```

2. Éditer `.env` et remplir :

```env
# API Claude
ANTHROPIC_API_KEY=sk-ant-api03-...votre_clé...

# Firebase Admin
FIREBASE_PROJECT_ID=metre-bet-3dcb1
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_COMPLETE_ICI\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@metre-bet-3dcb1.iam.gserviceaccount.com

# WhatsApp
WHATSAPP_GROUP_NAME=Planning Chantier

# Debug
DEBUG=true
```

**⚠️ Important pour FIREBASE_PRIVATE_KEY :**
- Garder les guillemets doubles `"`
- Garder les `\n` dans la clé (ne pas remplacer par de vrais retours à la ligne)
- Copier la clé ENTIÈRE du fichier JSON Firebase

---

### **Étape 4 : Obtenir la clé API Claude**

1. Aller sur https://console.anthropic.com/
2. **Settings** → **API Keys**
3. **Create Key** → Copier la clé (commence par `sk-ant-api03-`)
4. Coller dans `.env` → `ANTHROPIC_API_KEY=...`

**Prix :** 
- 5$ de crédit gratuit à l'inscription
- ~0.01$ par message analysé
- ~1000 messages = 10$

---

### **Étape 5 : Premier lancement**

```bash
npm start
```

**Résultat attendu :**
```
🚀 Démarrage du bot WhatsApp Planning...

✅ Firebase Admin initialisé
✅ Connexion Firestore réussie !

📱 Scannez ce QR code avec WhatsApp :
[QR CODE ASCII]

1. Ouvrez WhatsApp sur votre téléphone
2. Menu > Appareils connectés > Connecter un appareil
3. Scannez le QR code ci-dessus
```

**Scanner le QR code avec WhatsApp** → Le bot se connecte

```
✅ Bot WhatsApp connecté et prêt !
📋 Écoute du groupe : Planning Chantier
```

---

## 🧪 Test du bot

### **Test 1 : Message complet**
Dans WhatsApp, écrivez :
```
Demain 14h livraison béton avec Jean
```

**Réponse attendue du bot :**
```
✅ Tâche ajoutée au planning !

📅 jeudi 12 mars 2026
🕐 14:00
📋 Livraison béton
👤 Jean
```

### **Test 2 : Message incomplet**
```
Livraison béton demain
```

**Réponse attendue :**
```
À quelle heure est prévue la livraison de béton demain ?
```

Répondez : `14h`

**Bot :**
```
✅ Tâche ajoutée au planning !
[détails...]
```

### **Test 3 : Message non lié**
```
Salut les gars !
```

**Bot** : (pas de réponse = ignoré correctement)

---

## 📊 Vérification site web

1. Ouvrir votre site
2. Onglet **📅 Planning**
3. La tâche apparaît **automatiquement** !

---

## 🔧 Déploiement sur Railway

Railway héberge votre bot 24/7 pour ~5$/mois.

### **Étape 1 : Créer compte Railway**

1. Aller sur https://railway.app/
2. **Sign up with GitHub**
3. Vérifier email

### **Étape 2 : Nouveau projet**

1. **New Project**
2. **Deploy from GitHub repo** (ou **Empty Project** si pas de repo)
3. Si vous n'avez pas de repo GitHub :
   - Créez-en un sur github.com
   - Uploadez le dossier `whatsapp-bot`

### **Étape 3 : Configuration Railway**

1. **Settings** → **Environment Variables**
2. Ajouter TOUTES les variables du fichier `.env` :

```
ANTHROPIC_API_KEY=sk-ant-...
FIREBASE_PROJECT_ID=metre-bet-3dcb1
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
WHATSAPP_GROUP_NAME=Planning Chantier
DEBUG=false
```

3. **Settings** → **Start Command** : `npm start`

### **Étape 4 : Déployer**

1. **Deploy Now**
2. Railway build et démarre le bot
3. **Logs** : Voir le QR code dans les logs
4. **Scanner le QR code** (copier-coller le QR en ASCII dans un terminal local pour le voir)

### **⚠️ Problème avec le QR code sur Railway**

Railway ne peut pas afficher le QR en ASCII directement. **Solution** :

#### **Option A : Auth locale puis upload**
1. Lancer le bot **localement** : `npm start`
2. Scanner le QR code → Session sauvegardée dans `.wwebjs_auth/`
3. **Uploader** le dossier `.wwebjs_auth/` sur Railway (via GitHub)
4. Déployer sur Railway → Session déjà active, pas besoin de QR

#### **Option B : Telegram Bot pour QR**
Modifier `index.js` pour envoyer le QR code par Telegram/Email au lieu de l'afficher.

---

## 📝 Exemples de messages reconnus

| Message | Extraction |
|---------|-----------|
| `Demain 14h livraison béton @Jean` | ✅ Date, heure, activité, personne |
| `Rdv mardi 9h inspection` | ✅ Date, heure, activité |
| `Jeudi aprem pose bardage toute l'équipe` | ✅ Date, heure approximative, activité |
| `Livraison lundi` | ❓ Demande l'heure |
| `Inspection avec l'architecte` | ❓ Demande date et heure |

---

## 🐛 Dépannage

### **Bot ne répond pas**

1. Vérifier que le bot est connecté : `✅ Bot WhatsApp connecté`
2. Vérifier le nom du groupe dans `.env`
3. Activer DEBUG : `DEBUG=true` dans `.env`
4. Voir les logs : `console.log` affiche tout

### **Erreur API Claude**

```
❌ Erreur API Claude: 401 Unauthorized
```
→ Vérifier `ANTHROPIC_API_KEY` dans `.env`

### **Erreur Firestore**

```
❌ Erreur sauvegarde Firestore: permission-denied
```
→ Vérifier les règles Firestore (collection `planning`)

### **Bot déconnecté**

```
⚠️ Déconnecté: NAVIGATION
```
→ Rescanner le QR code : `rm -rf .wwebjs_auth` puis relancer

---

## 💡 Améliorations futures

- [ ] Notifications WhatsApp pour rappels (1h avant tâche)
- [ ] Commandes : `/planning` pour voir le planning du jour
- [ ] Modification de tâches : "Repousser livraison à 15h"
- [ ] Intégration météo : "Annuler si pluie"
- [ ] Export PDF du planning hebdomadaire
- [ ] Reconnaissance vocale des messages audio

---

## 📞 Support

En cas de problème :
1. Vérifier les logs : `npm start` en local
2. Tester les connexions :
   - Claude API : voir les logs au démarrage
   - Firestore : voir les logs au démarrage
3. Mode DEBUG : `DEBUG=true` pour plus de détails

---

## 🎉 C'est prêt !

Votre bot est opérationnel ! Il écoute maintenant le groupe WhatsApp et met à jour le planning automatiquement.

**Workflow complet :**
1. Message WhatsApp → Bot reçoit
2. Claude analyse → Extrait les infos
3. Firestore sauvegarde → Temps réel
4. Site web affiche → Mise à jour instantanée

✨ **Le planning se gère tout seul !** ✨
