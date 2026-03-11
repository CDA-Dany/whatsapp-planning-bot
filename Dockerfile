FROM node:18-slim

# Installer les dépendances système pour Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Exposer le port (optionnel)
EXPOSE 3000

# Démarrer l'application
CMD ["npm", "start"]
```

4. **Commit new file**

---

### **Railway détectera automatiquement le Dockerfile**

Railway va :
1. Voir le Dockerfile
2. L'utiliser au lieu de Nixpacks
3. Installer TOUTES les dépendances
4. Démarrer le bot

---

## ⏳ Temps d'attente

- Upload : 30 sec
- Railway rebuild : **5-7 minutes** (plus long car Docker)

---

## 🎯 Ce que tu devrais voir après
```
Building...
[+] Building 350.5s
Successfully built
Starting...
✅ Firebase Admin initialisé
🚀 Démarrage du bot WhatsApp Planning...
📱 QR Code généré !
🌐 URL du QR code :
https://api.qrserver.com/v1/...
