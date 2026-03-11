import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import dotenv from 'dotenv';
import { analyzerMessage } from './claude.js';
import { sauvegarderTachePlanning } from './firestore.js';

dotenv.config();

// Configuration
const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || 'Planning Chantier';
const GROUP_ID = process.env.WHATSAPP_GROUP_ID || null;
const DEBUG = process.env.DEBUG === 'true';
const EMAIL_NOTIFICATIONS = process.env.EMAIL_FOR_QR || null;

// Initialisation du client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Stockage temporaire pour les conversations en cours
const conversationsEnCours = new Map();

// ========================
// ÉVÉNEMENTS WHATSAPP
// ========================

client.on('qr', async (qr) => {
    console.log('📱 QR Code généré !');
    
    if (EMAIL_NOTIFICATIONS) {
        // Envoyer par email (nécessite service email)
        console.log('📧 Envoi du QR code par email...');
        // TODO: Intégrer service email (SendGrid, Mailgun, etc.)
    } else {
        // Afficher l'URL du QR code pour le générer ailleurs
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
        console.log('\n📱 Scanner ce QR code avec WhatsApp :');
        console.log('🌐 URL du QR code :');
        console.log(qrUrl);
        console.log('\n1. Copie cette URL dans ton navigateur');
        console.log('2. Le QR code s\'affiche');
        console.log('3. Ouvre WhatsApp > Appareils connectés > Scanner\n');
    }
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp connecté et prêt !');
    console.log(`📋 Écoute du groupe : ${GROUP_NAME}`);
});

client.on('authenticated', () => {
    console.log('🔐 Authentification réussie !');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Échec d\'authentification:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ Déconnecté:', reason);
});

// ========================
// TRAITEMENT DES MESSAGES
// ========================

client.on('message', async (message) => {
    try {
        const chat = await message.getChat();
        
        // Vérifier si c'est le bon groupe
        const isTargetGroup = chat.isGroup && (
            chat.name === GROUP_NAME || 
            (GROUP_ID && chat.id._serialized === GROUP_ID)
        );
        
        if (!isTargetGroup) {
            return; // Ignorer les autres conversations
        }
        
        // Ignorer les messages du bot lui-même
        if (message.fromMe) {
            return;
        }
        
        const messageText = message.body.trim();
        const contact = await message.getContact();
        const senderName = contact.pushname || contact.name || 'Inconnu';
        
        if (DEBUG) {
            console.log(`\n📩 Message de ${senderName}: "${messageText}"`);
        }
        
        // Ignorer les messages vides ou les médias sans texte
        if (!messageText) {
            return;
        }
        
        // Analyser le message avec Claude
        await traiterMessage(message, messageText, senderName, chat);
        
    } catch (error) {
        console.error('❌ Erreur traitement message:', error);
    }
});

// ========================
// LOGIQUE PRINCIPALE
// ========================

async function traiterMessage(message, texte, senderName, chat) {
    try {
        // Récupérer la conversation en cours pour ce groupe (si elle existe)
        const conversationId = chat.id._serialized;
        const conversationContext = conversationsEnCours.get(conversationId) || [];
        
        // Analyser avec Claude
        const analyse = await analyzerMessage(texte, senderName, conversationContext);
        
        if (DEBUG) {
            console.log('🤖 Analyse Claude:', JSON.stringify(analyse, null, 2));
        }
        
        // Traiter selon le type de résultat
        switch (analyse.action) {
            case 'ajouter_planning':
                await ajouterAuPlanning(analyse.tache, chat);
                // Effacer le contexte de conversation
                conversationsEnCours.delete(conversationId);
                break;
                
            case 'demander_precision':
                await demanderPrecision(analyse.question, chat);
                // Sauvegarder le contexte
                conversationContext.push({ role: 'user', content: texte });
                conversationContext.push({ role: 'assistant', content: analyse.question });
                conversationsEnCours.set(conversationId, conversationContext);
                break;
                
            case 'ignorer':
                if (DEBUG) {
                    console.log('ℹ️ Message ignoré (pas lié au planning)');
                }
                // Effacer le contexte si pas lié au planning
                conversationsEnCours.delete(conversationId);
                break;
                
            default:
                console.warn('⚠️ Action inconnue:', analyse.action);
        }
        
    } catch (error) {
        console.error('❌ Erreur traitement:', error);
        await chat.sendMessage('⚠️ Désolé, j\'ai rencontré une erreur. Pouvez-vous reformuler ?');
    }
}

async function ajouterAuPlanning(tache, chat) {
    try {
        // Sauvegarder dans Firestore
        await sauvegarderTachePlanning(tache);
        
        // Confirmer dans WhatsApp
        const dateFormatee = new Date(tache.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        let confirmation = `✅ *Tâche ajoutée au planning !*\n\n`;
        confirmation += `📅 ${dateFormatee}\n`;
        if (tache.heure) confirmation += `🕐 ${tache.heure}\n`;
        confirmation += `📋 ${tache.activite}\n`;
        if (tache.personnes && tache.personnes.length > 0) {
            confirmation += `👤 ${tache.personnes.join(', ')}\n`;
        }
        if (tache.lieu) confirmation += `📍 ${tache.lieu}\n`;
        
        await chat.sendMessage(confirmation);
        
        console.log('✅ Tâche ajoutée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur ajout planning:', error);
        await chat.sendMessage('❌ Erreur lors de l\'ajout au planning. Réessayez plus tard.');
    }
}

async function demanderPrecision(question, chat) {
    try {
        await chat.sendMessage(question);
        console.log('❓ Question posée:', question);
    } catch (error) {
        console.error('❌ Erreur envoi question:', error);
    }
}

// ========================
// DÉMARRAGE
// ========================

console.log('🚀 Démarrage du bot WhatsApp Planning...\n');
client.initialize();

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
    console.log('\n⚠️ Arrêt du bot...');
    await client.destroy();
    process.exit(0);
});
