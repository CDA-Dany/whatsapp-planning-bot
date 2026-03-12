import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import { analyzerMessage } from './claude.js';
import { sauvegarderTachePlanning, rechercherTaches, supprimerTaches, modifierTaches } from './firestore.js';

dotenv.config();

// Configuration
const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || 'Planning Chantier';
const GROUP_ID = process.env.WHATSAPP_GROUP_ID || null;
const DEBUG = process.env.DEBUG === 'true';

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

client.on('qr', (qr) => {
    console.log('\n📱 SCAN QR CODE WHATSAPP\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp connecté et prêt !');
    console.log(`📋 Écoute du groupe : ${GROUP_NAME}`);
    if (GROUP_ID) {
        console.log(`📋 ID du groupe : ${GROUP_ID}`);
    }
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
        
        // DEBUG: Afficher TOUS les messages reçus
        if (DEBUG) {
            console.log('\n📨 Message reçu:');
            console.log('  Type:', chat.isGroup ? 'Groupe' : 'Privé');
            console.log('  Nom du chat:', chat.name);
            console.log('  ID du chat:', chat.id._serialized);
            console.log('  Contenu:', message.body);
            console.log('  De moi?', message.fromMe);
        }
        
        // Vérifier si c'est le bon groupe
        const isTargetGroup = chat.isGroup && (
            chat.name === GROUP_NAME || 
            (GROUP_ID && chat.id._serialized === GROUP_ID)
        );
        
        if (DEBUG) {
            console.log('  Groupe cible configuré:', GROUP_NAME);
            console.log('  Est le groupe cible?', isTargetGroup);
            console.log('---');
        }
        
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
            console.log(`\n📩 Message à traiter de ${senderName}: "${messageText}"`);
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
                conversationsEnCours.delete(conversationId);
                break;
                
            case 'ajouter_planning_multiple':
                await ajouterPlusieursTaches(analyse.taches, chat);
                conversationsEnCours.delete(conversationId);
                break;
                
            case 'supprimer_planning':
                await supprimerDuPlanning(analyse.criteres, analyse.confirmation, chat);
                conversationsEnCours.delete(conversationId);
                break;
                
            case 'modifier_planning':
                await modifierLePlanning(analyse.criteres, analyse.modifications, analyse.confirmation, chat);
                conversationsEnCours.delete(conversationId);
                break;
                
            case 'demander_precision':
                await demanderPrecision(analyse.question, chat);
                conversationContext.push({ role: 'user', content: texte });
                conversationContext.push({ role: 'assistant', content: analyse.question });
                conversationsEnCours.set(conversationId, conversationContext);
                break;
                
            case 'ignorer':
                if (DEBUG) {
                    console.log('ℹ️ Message ignoré (pas lié au planning)');
                }
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
        // Ajouter valeurs par défaut si manquantes (pour éviter crash)
        const tacheComplete = {
            date: tache.date || new Date().toISOString().split('T')[0], // Par défaut : aujourd'hui
            heure: tache.heure || null,
            activite: tache.activite || 'Tâche sans description',
            personnes: tache.personnes || [],
            lieu: tache.lieu || null,
            status: tache.status || 'planifie',
            notes: tache.notes || null
        };
        
        // Sauvegarder dans Firestore
        await sauvegarderTachePlanning(tacheComplete);
        
        // Confirmer dans WhatsApp
        const dateFormatee = new Date(tacheComplete.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        let confirmation = `✅ *Tâche ajoutée au planning !*\n\n`;
        confirmation += `📅 ${dateFormatee}\n`;
        if (tacheComplete.heure) confirmation += `🕐 ${tacheComplete.heure}\n`;
        confirmation += `📋 ${tacheComplete.activite}\n`;
        if (tacheComplete.personnes && tacheComplete.personnes.length > 0) {
            confirmation += `👤 ${tacheComplete.personnes.join(', ')}\n`;
        }
        if (tacheComplete.lieu) confirmation += `📍 ${tacheComplete.lieu}\n`;
        
        await chat.sendMessage(confirmation);
        
        console.log('✅ Tâche ajoutée avec succès');
        
    } catch (error) {
        console.error('❌ Erreur ajout planning:', error);
        await chat.sendMessage('❌ Erreur lors de l\'ajout au planning. Réessayez plus tard.');
    }
}

async function ajouterPlusieursTaches(taches, chat) {
    try {
        if (!taches || taches.length === 0) {
            await chat.sendMessage('❌ Aucune tâche à ajouter.');
            return;
        }
        
        // Sauvegarder toutes les tâches
        for (const tache of taches) {
            const tacheComplete = {
                date: tache.date || new Date().toISOString().split('T')[0],
                heure: tache.heure || null,
                activite: tache.activite || 'Tâche sans description',
                personnes: tache.personnes || [],
                lieu: tache.lieu || null,
                status: tache.status || 'planifie',
                notes: tache.notes || null
            };
            
            await sauvegarderTachePlanning(tacheComplete);
        }
        
        // Confirmer dans WhatsApp
        let confirmation = `✅ *${taches.length} tâche(s) ajoutée(s) au planning !*\n\n`;
        
        taches.forEach((tache, index) => {
            const dateFormatee = new Date(tache.date || new Date()).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            
            confirmation += `${index + 1}. `;
            if (tache.personnes && tache.personnes.length > 0) {
                confirmation += `${tache.personnes.join(', ')} - `;
            }
            confirmation += `${dateFormatee}`;
            if (tache.heure) confirmation += ` à ${tache.heure}`;
            if (tache.activite) confirmation += ` - ${tache.activite}`;
            if (tache.lieu) confirmation += ` (${tache.lieu})`;
            confirmation += '\n';
        });
        
        await chat.sendMessage(confirmation);
        
        console.log(`✅ ${taches.length} tâche(s) ajoutée(s) avec succès`);
        
    } catch (error) {
        console.error('❌ Erreur ajout planning multiple:', error);
        await chat.sendMessage('❌ Erreur lors de l\'ajout des tâches. Réessayez plus tard.');
    }
}

async function supprimerDuPlanning(criteres, confirmation, chat) {
    try {
        // Rechercher les tâches correspondantes
        const taches = await rechercherTaches(criteres);
        
        if (taches.length === 0) {
            await chat.sendMessage('❌ Aucune tâche trouvée correspondant à ces critères.');
            return;
        }
        
        // Supprimer les tâches
        const ids = taches.map(t => t.id);
        await supprimerTaches(ids);
        
        // Confirmation dans WhatsApp
        let message = `✅ *${taches.length} tâche(s) supprimée(s) !*\n\n`;
        
        taches.forEach(t => {
            const dateFormatee = new Date(t.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            message += `📅 ${dateFormatee}`;
            if (t.heure) message += ` à ${t.heure}`;
            message += `\n📋 ${t.activite}\n\n`;
        });
        
        await chat.sendMessage(message);
        console.log('✅ Tâche(s) supprimée(s) avec succès');
        
    } catch (error) {
        console.error('❌ Erreur suppression planning:', error);
        await chat.sendMessage('❌ Erreur lors de la suppression. Réessayez plus tard.');
    }
}

async function modifierLePlanning(criteres, modifications, confirmation, chat) {
    try {
        // Rechercher les tâches correspondantes
        const taches = await rechercherTaches(criteres);
        
        if (taches.length === 0) {
            await chat.sendMessage('❌ Aucune tâche trouvée correspondant à ces critères.');
            return;
        }
        
        // Modifier les tâches
        const ids = taches.map(t => t.id);
        await modifierTaches(ids, modifications);
        
        // Confirmation dans WhatsApp
        let message = `✅ *${taches.length} tâche(s) modifiée(s) !*\n\n`;
        
        taches.forEach(t => {
            const dateFormatee = new Date(modifications.date || t.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            message += `📅 ${dateFormatee}`;
            if (modifications.heure || t.heure) {
                message += ` à ${modifications.heure || t.heure}`;
            }
            message += `\n📋 ${modifications.activite || t.activite}\n`;
            if (modifications.personnes || t.personnes) {
                message += `👤 ${(modifications.personnes || t.personnes).join(', ')}\n`;
            }
            message += '\n';
        });
        
        await chat.sendMessage(message);
        console.log('✅ Tâche(s) modifiée(s) avec succès');
        
    } catch (error) {
        console.error('❌ Erreur modification planning:', error);
        await chat.sendMessage('❌ Erreur lors de la modification. Réessayez plus tard.');
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
