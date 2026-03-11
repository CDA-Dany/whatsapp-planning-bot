# 🚂 Déploiement DIRECT sur Railway (SANS Node.js local)

## ✅ Tu n'as PAS besoin de Node.js sur ton ordinateur !

Railway installe automatiquement Node.js sur leurs serveurs.

---

## 📋 Ce dont tu as besoin

1. ✅ Compte Railway (gratuit)
2. ✅ Compte GitHub (gratuit)
3. ✅ Clé API Claude
4. ✅ Credentials Firebase
5. ✅ WhatsApp sur ton téléphone

**→ Zéro installation sur ton ordi !**

---

## 🚀 Déploiement en 15 minutes

### **Étape 1 : GitHub (5 min)**

#### **1.1 Créer un repo GitHub**
1. https://github.com/new
2. Nom : `whatsapp-planning-bot`
3. Public ou Private (ton choix)
4. **Create repository**

#### **1.2 Upload les fichiers**
1. **Add file** → **Upload files**
2. Glisse-déposer TOUT le dossier `whatsapp-bot/`
3. **Commit changes**

✅ Ton code est sur GitHub !

---

### **Étape 2 : Railway (3 min)**

#### **2.1 Créer compte**
1. https://railway.app/
2. **Start a New Project**
3. **Sign in with GitHub**

#### **2.2 Nouveau projet**
1. **New Project**
2. **Deploy from GitHub repo**
3. Sélectionner `whatsapp-planning-bot`
4. Railway commence le build

---

### **Étape 3 : Variables (3 min)**

1. Cliquer sur le projet déployé
2. **Variables** (onglet)
3. Ajouter ces variables :

```
ANTHROPIC_API_KEY=sk-ant-api03-VOTRE_CLE
FIREBASE_PROJECT_ID=metre-bet-3dcb1
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_COMPLETE\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@metre-bet-3dcb1.iam.gserviceaccount.com
WHATSAPP_GROUP_NAME=Planning Chantier
DEBUG=false
```

4. Railway redémarre automatiquement

---

### **Étape 4 : QR Code (2 min)** ⭐

#### **Méthode : URL du QR code**

1. **Logs** dans Railway
2. Chercher cette ligne :
   ```
   🌐 URL du QR code :
   https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=...
   ```

3. **Copier l'URL complète**

4. **Ouvrir dans un navigateur**
   - Le QR code s'affiche à l'écran

5. **Scanner avec WhatsApp**
   - WhatsApp > ⋮ Menu > Appareils connectés
   - Connecter un appareil
   - Scanner le QR code affiché

✅ Bot connecté !

---

### **Étape 5 : Vérification (1 min)**

1. **Logs Railway** :
   ```
   ✅ Bot WhatsApp connecté et prêt !
   📋 Écoute du groupe : Planning Chantier
   ```

2. **Test WhatsApp** :
   ```
   Demain 14h livraison béton
   ```

3. **Bot répond** :
   ```
   ✅ Tâche ajoutée au planning !
   ```

4. **Site web** :
   - Onglet 📅 Planning
   - Tâche apparaît automatiquement !

---

## 🎯 Récapitulatif

```
GitHub (upload code)
    ↓
Railway (déploie automatiquement)
    ↓
Variables (configure)
    ↓
Logs (copie URL QR code)
    ↓
Navigateur (affiche QR code)
    ↓
WhatsApp (scanne)
    ↓
✅ Bot actif 24/7 !
```

**→ ZÉRO installation sur ton ordinateur !**

---

## 📱 Activer l'URL du QR code

Pour utiliser la méthode URL du QR code, il faut utiliser le fichier modifié :

### **Option A : Modifier index.js sur GitHub**

1. GitHub → `whatsapp-planning-bot` → `index.js`
2. Remplacer tout le contenu par celui de `index-qr-url.js`
3. **Commit**
4. Railway redéploie automatiquement

### **Option B : Renommer le fichier**

1. Renommer `index.js` → `index-old.js`
2. Renommer `index-qr-url.js` → `index.js`
3. Push sur GitHub
4. Railway redéploie

---

## 💡 Avantages de cette méthode

- ✅ **Zéro installation locale**
- ✅ **Pas besoin de Node.js**
- ✅ **QR code facile à scanner** (dans navigateur)
- ✅ **Déploiement en 15 minutes**
- ✅ **Bot actif 24/7** immédiatement

---

## 🔄 Updates futures

Pour modifier le bot plus tard :

1. **GitHub** → Modifier le fichier
2. **Commit**
3. Railway redéploie automatiquement

**Ou directement dans Railway :**
1. **Code** (onglet dans Railway)
2. Modifier le fichier
3. **Save** → Redéploiement auto

---

## 💰 Coûts

| Service | Prix |
|---------|------|
| **GitHub** | Gratuit |
| **Railway mois 1** | 5$ gratuit |
| **Railway mois 2+** | ~5$/mois |
| **Claude API** | 5$ gratuit puis ~10$/mois |

**Total démarrage : 0€**

---

## 🐛 Problèmes fréquents

### **QR code expiré**

**Symptôme** : QR code scanné mais rien ne se passe

**Solution** :
1. Railway → **Redémarrer** le projet
2. Nouveau QR code dans les logs
3. Re-scanner

### **Bot déconnecté après redémarrage**

**Symptôme** : `⚠️ Déconnecté: NAVIGATION`

**Solution** :
1. Les sessions WhatsApp expirent parfois
2. Railway → Logs → Nouveau QR code
3. Re-scanner

**Prévention** :
- Après première connexion, la session est sauvegardée
- Redémarrages normaux = pas besoin de re-scanner
- Seulement si session expirée (rare)

### **Variables pas reconnues**

**Symptôme** : `❌ Erreur API Claude` ou `❌ Erreur Firestore`

**Solution** :
1. Railway → Variables
2. Vérifier TOUTES les variables
3. Pas d'espaces avant/après
4. Redémarrer le projet

---

## ✅ Checklist finale

Avant de dire "c'est bon" :

- [ ] Code uploadé sur GitHub
- [ ] Projet créé sur Railway
- [ ] Toutes les variables ajoutées
- [ ] Logs montrent "Bot prêt"
- [ ] QR code scanné
- [ ] Test WhatsApp → Bot répond
- [ ] Site web → Tâche apparaît
- [ ] Ordinateur éteint → Bot marche encore ✨

---

## 🎉 Terminé !

**Tu n'as jamais installé Node.js sur ton ordinateur.**

**Ton bot tourne 24/7 sur Railway.**

**Tu peux éteindre ton ordi.**

**Le planning se gère tout seul !** ✨

---

## 📞 Support

- Railway Docs : https://docs.railway.app/
- Railway Discord : https://discord.gg/railway
- Status : https://status.railway.app/

**En cas de problème, check les logs Railway en premier !**
