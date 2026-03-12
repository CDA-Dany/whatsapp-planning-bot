import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import dotenv from 'dotenv';
import { analyzerMessage } from './claude.js';
import { sauvegarderTachePlanning, rechercherTaches, supprimerTaches, modifierTaches, detecterConflits } from './firestore.js';

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

// Stockage temporaire pour les tâches en attente de confirmation (conflits)
const tachesEnAttente = new Map();

// Stockage temporaire pour les modifications en attente de clarification
const modificationsEnAttente = new Map();

// ========================
// ÉVÉNEMENTS WHATSAPP
// ========================

client.on('qr', (qr) => {
    // Générer l'URL du QR code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
    
    console.log('\n========================================');
    console.log('📱 SCAN QR CODE WHATSAPP');
    console.log('========================================');
    console.log('\n🌐 Ouvre cette URL dans ton navigateur :');
    console.log('\n' + qrUrl + '\n');
    console.log('========================================\n');
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
        
        // PRIORITÉ 0 : Vérifier si c'est une réponse à une clarification de modification/suppression
        const modifEnAttente = modificationsEnAttente.get(conversationId);
        if (modifEnAttente) {
            const reponse = texte.toLowerCase().trim();
            
            // Chercher si la réponse correspond à un des lieux/activités proposés
            let tacheChoisie = null;
            
            for (const tache of modifEnAttente.taches) {
                const lieuLower = tache.lieu?.toLowerCase() || '';
                const activiteLower = tache.activite?.toLowerCase() || '';
                
                // Vérifier si la réponse contient le lieu ou l'activité
                if ((lieuLower && reponse.includes(lieuLower)) || 
                    (activiteLower && reponse.includes(activiteLower))) {
                    tacheChoisie = tache;
                    break;
                }
                
                // Vérifier aussi les réponses par numéro (1, 2, etc.)
                const match = reponse.match(/^(\d+)$/);
                if (match) {
                    const index = parseInt(match[1]) - 1;
                    if (index >= 0 && index < modifEnAttente.taches.length) {
                        tacheChoisie = modifEnAttente.taches[index];
                        break;
                    }
                }
            }
            
            if (tacheChoisie) {
                if (modifEnAttente.isSuppression) {
                    // SUPPRESSION
                    await supprimerTaches([tacheChoisie.id]);
                    
                    const dateFormatee = new Date(tacheChoisie.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    });
                    
                    let confirmation = `✅ *Tâche supprimée !*\n\n`;
                    confirmation += `📅 ${dateFormatee}`;
                    if (tacheChoisie.heure) confirmation += ` à ${tacheChoisie.heure}`;
                    confirmation += `\n📋 ${tacheChoisie.activite}`;
                    if (tacheChoisie.lieu) confirmation += ` (${tacheChoisie.lieu})`;
                    
                    await chat.sendMessage(confirmation);
                    
                } else {
                    // MODIFICATION
                    await modifierTaches([tacheChoisie.id], modifEnAttente.modifications);
                    
                    const dateFormatee = new Date(modifEnAttente.modifications.date || tacheChoisie.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    });
                    
                    let confirmation = `✅ *Tâche modifiée !*\n\n`;
                    confirmation += `📅 ${dateFormatee}`;
                    if (modifEnAttente.modifications.heure || tacheChoisie.heure) {
                        confirmation += ` à ${modifEnAttente.modifications.heure || tacheChoisie.heure}`;
                    }
                    confirmation += `\n📋 ${modifEnAttente.modifications.activite || tacheChoisie.activite}`;
                    if (modifEnAttente.modifications.lieu || tacheChoisie.lieu) {
                        confirmation += ` (${modifEnAttente.modifications.lieu || tacheChoisie.lieu})`;
                    }
                    
                    await chat.sendMessage(confirmation);
                }
                
                // Nettoyer
                modificationsEnAttente.delete(conversationId);
                conversationsEnCours.delete(conversationId);
                return;
            } else {
                // Réponse pas comprise, redemander
                await chat.sendMessage('❓ Répondez avec le numéro ou le nom du lieu (ex: "1" ou "Gras")');
                return;
            }
        }
        
        // PRIORITÉ 1 : Vérifier si c'est une réponse à une confirmation de conflit
        const tacheEnAttente = tachesEnAttente.get(conversationId);
        if (tacheEnAttente) {
            const reponse = texte.toLowerCase().trim();
            
            // Réponses positives
            if (reponse === 'oui' || reponse === 'ok' || reponse === 'modifier' || reponse === 'remplacer' || reponse === 'yes') {
                
                if (tacheEnAttente.isMultiple) {
                    // Cas multiple : supprimer toutes les anciennes et ajouter toutes les nouvelles
                    for (const item of tacheEnAttente.conflitsMultiples) {
                        for (const conflit of item.conflits) {
                            await supprimerTaches([conflit.tacheExistante.id]);
                        }
                    }
                    
                    // Ajouter toutes les nouvelles tâches
                    for (const tache of tacheEnAttente.nouvellesTaches) {
                        await sauvegarderTachePlanning(tache);
                    }
                    
                    await chat.sendMessage(`✅ ${tacheEnAttente.nouvellesTaches.length} tâche(s) modifiée(s) avec succès !`);
                    
                } else {
                    // Cas simple : supprimer l'ancienne et ajouter la nouvelle
                    await supprimerTaches([tacheEnAttente.conflit.tacheExistante.id]);
                    await ajouterAuPlanningSansVerification(tacheEnAttente.nouvelleTache, chat);
                }
                
                // Nettoyer
                tachesEnAttente.delete(conversationId);
                conversationsEnCours.delete(conversationId);
                return;
            }
            
            // Réponses négatives
            if (reponse === 'non' || reponse === 'annuler' || reponse === 'no') {
                await chat.sendMessage('❌ Ajout annulé. La tâche existante est conservée.');
                
                // Nettoyer
                tachesEnAttente.delete(conversationId);
                conversationsEnCours.delete(conversationId);
                return;
            }
            
            // Réponse pas claire
            await chat.sendMessage('Répondez par "Oui" pour modifier ou "Non" pour annuler.');
            return;
        }
        
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
        // Ajouter valeurs par défaut si manquantes
        const tacheComplete = {
            date: tache.date || new Date().toISOString().split('T')[0],
            heure: tache.heure || null,
            activite: tache.activite || 'Tâche sans description',
            personnes: tache.personnes || [],
            lieu: tache.lieu || null,
            status: tache.status || 'planifie',
            notes: tache.notes || null
        };
        
        // VÉRIFIER LES CONFLITS
        const conflits = await detecterConflits(tacheComplete);
        
        if (conflits.length > 0) {
            // Il y a un conflit !
            const conflit = conflits[0]; // Premier conflit
            const tacheExistante = conflit.tacheExistante;
            
            const dateFormatee = new Date(tacheComplete.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            
            let message = `⚠️ *Conflit détecté !*\n\n`;
            message += `${conflit.personne} est déjà prévu(e) ${dateFormatee} :\n`;
            if (tacheExistante.heure) message += `🕐 ${tacheExistante.heure}\n`;
            message += `📋 ${tacheExistante.activite}\n`;
            if (tacheExistante.lieu) message += `📍 ${tacheExistante.lieu}\n`;
            message += `\n❓ Modifier pour la nouvelle tâche ?\n`;
            message += `Répondez *Oui* ou *Non*`;
            
            await chat.sendMessage(message);
            
            // Stocker la tâche en attente
            const conversationId = chat.id._serialized;
            tachesEnAttente.set(conversationId, {
                nouvelleTache: tacheComplete,
                conflit: conflit
            });
            
            console.log('⚠️ Conflit détecté, attente de confirmation');
            return;
        }
        
        // Pas de conflit, ajouter normalement
        await ajouterAuPlanningSansVerification(tacheComplete, chat);
        
    } catch (error) {
        console.error('❌ Erreur ajout planning:', error);
        await chat.sendMessage('❌ Erreur lors de l\'ajout au planning. Réessayez plus tard.');
    }
}

async function ajouterAuPlanningSansVerification(tacheComplete, chat) {
    try {
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
        throw error;
    }
}

async function ajouterPlusieursTaches(taches, chat) {
    try {
        if (!taches || taches.length === 0) {
            await chat.sendMessage('❌ Aucune tâche à ajouter.');
            return;
        }
        
        // Préparer toutes les tâches
        const tachesCompletes = taches.map(tache => ({
            date: tache.date || new Date().toISOString().split('T')[0],
            heure: tache.heure || null,
            activite: tache.activite || 'Tâche sans description',
            personnes: tache.personnes || [],
            lieu: tache.lieu || null,
            status: tache.status || 'planifie',
            notes: tache.notes || null
        }));
        
        // Vérifier les conflits pour toutes les tâches
        const tousLesConflits = [];
        for (const tache of tachesCompletes) {
            const conflits = await detecterConflits(tache);
            if (conflits.length > 0) {
                tousLesConflits.push({
                    tache: tache,
                    conflits: conflits
                });
            }
        }
        
        // Si des conflits existent, demander confirmation
        if (tousLesConflits.length > 0) {
            let message = `⚠️ *${tousLesConflits.length} conflit(s) détecté(s) !*\n\n`;
            
            tousLesConflits.forEach((item, index) => {
                const conflit = item.conflits[0];
                const dateFormatee = new Date(item.tache.date).toLocaleDateString('fr-FR', {
                    weekday: 'long'
                });
                
                message += `${index + 1}. ${conflit.personne} est déjà prévu(e) ${dateFormatee}\n`;
            });
            
            message += `\n❓ Modifier toutes ces tâches ?\n`;
            message += `Répondez *Oui* ou *Non*`;
            
            await chat.sendMessage(message);
            
            // Pour simplifier, on traite les tâches multiples comme une seule confirmation
            // On supprimera toutes les anciennes et ajoutera toutes les nouvelles
            const conversationId = chat.id._serialized;
            tachesEnAttente.set(conversationId, {
                nouvellesTaches: tachesCompletes,
                conflitsMultiples: tousLesConflits,
                isMultiple: true
            });
            
            console.log('⚠️ Conflits multiples détectés, attente de confirmation');
            return;
        }
        
        // Pas de conflits, ajouter toutes les tâches
        for (const tache of tachesCompletes) {
            await sauvegarderTachePlanning(tache);
        }
        
        // Confirmer dans WhatsApp
        let confirmation = `✅ *${taches.length} tâche(s) ajoutée(s) au planning !*\n\n`;
        
        tachesCompletes.forEach((tache, index) => {
            const dateFormatee = new Date(tache.date).toLocaleDateString('fr-FR', {
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
        
        // Si plusieurs tâches trouvées, demander laquelle supprimer
        if (taches.length > 1) {
            let question = `❓ Plusieurs tâches correspondent. Laquelle supprimer ?\n\n`;
            
            taches.forEach((t, index) => {
                const dateFormatee = new Date(t.date).toLocaleDateString('fr-FR', {
                    weekday: 'long'
                });
                question += `${index + 1}. ${dateFormatee}`;
                if (t.heure) question += ` ${t.heure}`;
                question += ` - ${t.activite}`;
                if (t.lieu) question += ` chez ${t.lieu}`;
                question += '\n';
            });
            
            question += '\n💬 Répondez avec le numéro ou le lieu (ex: "1" ou "Gras")';
            await chat.sendMessage(question);
            
            // Stocker en attente de réponse (avec flag suppression)
            const conversationId = chat.id._serialized;
            modificationsEnAttente.set(conversationId, {
                taches: taches,
                isSuppression: true
            });
            
            console.log('❓ Plusieurs tâches trouvées pour suppression, attente de clarification');
            return;
        }
        
        // Une seule tâche, supprimer directement
        const tache = taches[0];
        await supprimerTaches([tache.id]);
        
        // Confirmation dans WhatsApp
        const dateFormatee = new Date(tache.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        let message = `✅ *Tâche supprimée !*\n\n`;
        message += `📅 ${dateFormatee}`;
        if (tache.heure) message += ` à ${tache.heure}`;
        message += `\n📋 ${tache.activite}`;
        if (tache.lieu) message += ` (${tache.lieu})`;
        
        await chat.sendMessage(message);
        console.log('✅ Tâche supprimée avec succès');
        
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
        
        // Si plusieurs tâches trouvées, demander laquelle modifier
        if (taches.length > 1) {
            let question = `❓ Plusieurs tâches correspondent. Laquelle modifier ?\n\n`;
            
            taches.forEach((t, index) => {
                const dateFormatee = new Date(t.date).toLocaleDateString('fr-FR', {
                    weekday: 'long'
                });
                question += `${index + 1}. ${dateFormatee}`;
                if (t.heure) question += ` ${t.heure}`;
                question += ` - ${t.activite}`;
                if (t.lieu) question += ` chez ${t.lieu}`;
                question += '\n';
            });
            
            question += '\n💬 Répondez avec le numéro ou le lieu (ex: "1" ou "Gras")';
            await chat.sendMessage(question);
            
            // Stocker en attente de réponse
            const conversationId = chat.id._serialized;
            modificationsEnAttente.set(conversationId, {
                taches: taches,
                modifications: modifications
            });
            
            console.log('❓ Plusieurs tâches trouvées, attente de clarification');
            return;
        }
        
        // Une seule tâche, modifier directement
        const tache = taches[0];
        const ids = [tache.id];
        await modifierTaches(ids, modifications);
        
        // Confirmation dans WhatsApp
        const dateFormatee = new Date(modifications.date || tache.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        let message = `✅ *Tâche modifiée !*\n\n`;
        message += `📅 ${dateFormatee}`;
        if (modifications.heure || tache.heure) {
            message += ` à ${modifications.heure || tache.heure}`;
        }
        message += `\n📋 ${modifications.activite || tache.activite}`;
        if (modifications.lieu || tache.lieu) {
            message += ` (${modifications.lieu || tache.lieu})`;
        }
        if (modifications.personnes || tache.personnes) {
            message += `\n👤 ${(modifications.personnes || tache.personnes).join(', ')}`;
        }
        
        await chat.sendMessage(message);
        console.log('✅ Tâche modifiée avec succès');
        
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
