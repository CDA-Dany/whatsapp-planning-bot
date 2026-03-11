# 🚂 Déploiement Railway - Guide ultra-simple

## ✅ Pourquoi Railway ?

- ✅ **Bot tourne 24/7** sans ton ordinateur
- ✅ **5$ gratuit** le premier mois
- ✅ **5$/mois** après (très abordable)
- ✅ **Setup en 10 minutes**

---

## 📋 Étapes

### **1. Créer compte Railway (2 min)**

1. Aller sur https://railway.app/
2. Cliquer **"Start a New Project"**
3. Se connecter avec **GitHub**
4. Vérifier email

---

### **2. Préparer le code (5 min)**

#### **Option A : Via GitHub (recommandé)**

1. **Créer un repo GitHub** (si pas déjà fait)
   - https://github.com/new
   - Nom : `whatsapp-planning-bot`
   - Public ou Private

2. **Upload le code**
   ```bash
   cd whatsapp-bot
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TON_USERNAME/whatsapp-planning-bot.git
   git push -u origin main
   ```

#### **Option B : Upload direct Railway**
- Railway permet d'uploader directement sans GitHub
- Moins pratique pour les updates

---

### **3. Créer le projet Railway (2 min)**

1. **Dashboard Railway** → **New Project**
2. **Deploy from GitHub repo**
3. Sélectionner `whatsapp-planning-bot`
4. Railway détecte automatiquement Node.js

---

### **4. Configurer les variables (3 min)**

1. Cliquer sur le projet
2. **Variables** (onglet)
3. Ajouter **TOUTES** ces variables :

```
ANTHROPIC_API_KEY=sk-ant-api03-VOTRE_CLE_ICI
FIREBASE_PROJECT_ID=metre-bet-3dcb1
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nVOTRE_CLE\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@metre-bet-3dcb1.iam.gserviceaccount.com
WHATSAPP_GROUP_NAME=Planning Chantier
DEBUG=false
```

**⚠️ IMPORTANT FIREBASE_PRIVATE_KEY :**
- Copier TOUTE la clé du JSON Firebase
- Garder les `\n` (ne PAS remplacer par des retours)
- Garder les guillemets au début/fin

---

### **5. Déployer (1 clic)**

1. **Settings** → **Start Command** : `npm start`
2. Cliquer **Deploy**
3. Attendre ~2 minutes

---

### **6. Scanner le QR code (problème à résoudre)**

Railway ne peut pas afficher le QR code directement.

#### **Solution : Authentification locale d'abord**

**Étape A : Auth locale**
```bash
# Sur ton ordi
cd whatsapp-bot
npm start
# Scanner le QR code
# Session sauvegardée dans .wwebjs_auth/
```

**Étape B : Upload la session**
```bash
# Ajouter au repo Git
git add .wwebjs_auth/
git commit -m "Add WhatsApp session"
git push
```

**Étape C : Redéployer sur Railway**
- Railway détecte le push
- Redéploie automatiquement
- Bot se connecte avec la session existante
- **Pas besoin de re-scanner le QR !**

---

### **7. Vérifier que ça tourne**

1. **Logs** (onglet dans Railway)
2. Voir :
   ```
   ✅ Firebase Admin initialisé
   ✅ Bot WhatsApp connecté et prêt !
   📋 Écoute du groupe : Planning Chantier
   ```

3. **Tester dans WhatsApp**
   ```
   Demain 14h livraison béton
   ```

4. **Bot répond** → ✅ C'est bon !

---

## 🔄 Updates du code

Après déploiement, pour modifier le bot :

```bash
# 1. Modifier le code localement
# 2. Commit
git add .
git commit -m "Amélioration du bot"
git push

# 3. Railway redéploie automatiquement
```

---

## 💰 Coûts Railway

| Période | Coût |
|---------|------|
| **Mois 1** | 0$ (5$ gratuit) |
| **Mois 2+** | ~5$/mois |

**Usage estimé :**
- Bot simple : ~3$/mois
- Bot + Base données : ~5$/mois
- Pas de surprise, prix fixe

---

## 🐛 Dépannage

### **Bot déconnecté sur Railway**
```
⚠️ Déconnecté: NAVIGATION
```

**Solution :**
1. Supprimer `.wwebjs_auth/` local
2. Relancer local : `npm start`
3. Re-scanner QR
4. Re-upload : `git add .wwebjs_auth/ && git commit && git push`

### **Variables pas reconnues**
- Vérifier orthographe exacte
- Vérifier pas d'espaces avant/après
- Redéployer après modification

### **Bot ne démarre pas**
- Voir **Logs** dans Railway
- Chercher ligne avec `❌`
- Souvent : variable manquante

---

## ✅ Checklist finale

Avant de dire "c'est bon" :

- [ ] Bot déployé sur Railway
- [ ] Variables configurées
- [ ] Logs montrent "✅ Bot connecté"
- [ ] Test WhatsApp → Bot répond
- [ ] Site web → Tâche apparaît
- [ ] Ordinateur éteint → Bot marche encore

---

## 🎉 Terminé !

Ton bot tourne maintenant 24/7 dans le cloud.

**Tu peux :**
- ✅ Éteindre ton ordinateur
- ✅ Partir en vacances
- ✅ Oublier le bot
- ✅ Il continue de fonctionner !

**Le planning se gère tout seul.** ✨

---

## 📞 Support Railway

- Docs : https://docs.railway.app/
- Discord : https://discord.gg/railway
- Status : https://status.railway.app/
