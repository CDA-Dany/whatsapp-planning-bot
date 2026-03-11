# ⚡ Démarrage rapide - 10 minutes

## 📥 **Étape 1 : Installation (2 min)**

```bash
cd whatsapp-bot
npm install
```

---

## 🔑 **Étape 2 : Configuration (5 min)**

### **A. Créer le fichier .env**
```bash
cp .env.example .env
```

### **B. Obtenir la clé Claude API**
1. https://console.anthropic.com/
2. **Settings** → **API Keys** → **Create Key**
3. Copier la clé (commence par `sk-ant-api03-`)

### **C. Obtenir les credentials Firebase**
1. https://console.firebase.google.com/
2. Projet **metre-bet-3dcb1**
3. ⚙️ **Paramètres** → **Comptes de service**
4. **Générer une nouvelle clé privée**
5. Télécharger le JSON

### **D. Remplir .env**
```env
ANTHROPIC_API_KEY=sk-ant-api03-[VOTRE_CLE_ICI]
FIREBASE_PROJECT_ID=metre-bet-3dcb1
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[CLE_DU_JSON]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=[EMAIL_DU_JSON]
WHATSAPP_GROUP_NAME=Planning Chantier
DEBUG=true
```

**⚠️ FIREBASE_PRIVATE_KEY :**
- Copier LA CLÉ ENTIÈRE du JSON Firebase
- Garder les `\n` (ne pas remplacer)
- Garder les guillemets doubles `"`

---

## ✅ **Étape 3 : Test (1 min)**

```bash
npm test
```

**Résultat attendu :**
```
✅ Connexion Claude API réussie !
✅ Connexion Firestore réussie !
✨ Tout est prêt ! Lancez le bot avec : npm start
```

---

## 🚀 **Étape 4 : Lancement (2 min)**

```bash
npm start
```

**Résultat :**
```
📱 Scannez ce QR code avec WhatsApp :
[QR CODE]
```

**Scanner le QR :**
1. WhatsApp sur téléphone
2. ⋮ Menu → **Appareils connectés**
3. **Connecter un appareil**
4. Scanner le QR code

```
✅ Bot WhatsApp connecté et prêt !
```

---

## 🧪 **Étape 5 : Test WhatsApp (1 min)**

Dans le groupe WhatsApp, écrivez :
```
Demain 14h livraison béton avec Jean
```

**Bot répond :**
```
✅ Tâche ajoutée au planning !

📅 jeudi 12 mars 2026
🕐 14:00
📋 Livraison béton
👤 Jean
```

**Sur le site web :**
- Onglet 📅 Planning
- La tâche apparaît automatiquement !

---

## ✨ **C'est prêt !**

Le bot écoute maintenant le groupe et met à jour le planning automatiquement.

---

## 🐛 **Problèmes fréquents**

### **npm install échoue**
```bash
# Réinstaller Node.js (version 18+)
node --version  # Doit être >= 18
```

### **npm test échoue sur Claude API**
- Vérifier `ANTHROPIC_API_KEY` dans `.env`
- Vérifier que la clé commence par `sk-ant-api03-`
- Vérifier crédit API : https://console.anthropic.com/

### **npm test échoue sur Firestore**
- Vérifier `FIREBASE_PRIVATE_KEY` dans `.env`
- Vérifier que la clé contient bien `\n` (pas de vrais retours)
- Télécharger à nouveau le JSON Firebase

### **QR code ne s'affiche pas**
```bash
# Terminal trop petit, agrandissez-le
# Ou désactiver le mode headless temporairement
```

### **Bot ne répond pas dans WhatsApp**
- Vérifier `WHATSAPP_GROUP_NAME` correspond au nom exact
- Activer `DEBUG=true` dans `.env`
- Voir les logs du bot

---

## 📞 **Besoin d'aide ?**

Voir le **README.md** complet pour plus de détails.
