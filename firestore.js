import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialisation Firebase Admin
const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('✅ Firebase Admin initialisé');

/**
 * Sauvegarde une tâche de planning dans Firestore
 */
export async function sauvegarderTachePlanning(tache) {
    try {
        const planningRef = db.collection('planning');
        
        const nouvelleTache = {
            ...tache,
            createdAt: new Date().toISOString(),
            createdBy: 'whatsapp_bot',
            updatedAt: new Date().toISOString()
        };
        
        await planningRef.add(nouvelleTache);
        
        console.log('✅ Tâche sauvegardée dans Firestore');
        return true;
    } catch (error) {
        console.error('❌ Erreur Firestore:', error);
        throw error;
    }
}

/**
 * Recherche des tâches selon des critères
 */
export async function rechercherTaches(criteres) {
    try {
        let query = db.collection('planning');
        
        // Filtrer par date si spécifiée
        if (criteres.date) {
            query = query.where('date', '==', criteres.date);
        }
        
        // Filtrer par personne si spécifiée
        if (criteres.personnes && criteres.personnes.length > 0) {
            query = query.where('personnes', 'array-contains-any', criteres.personnes);
        }
        
        const snapshot = await query.get();
        
        const taches = [];
        snapshot.forEach(doc => {
            const tacheData = {
                id: doc.id,
                ...doc.data()
            };
            
            // Filtres additionnels en mémoire (car Firestore ne permet pas tous les filtres combinés)
            let correspond = true;
            
            // Filtrer par activité si spécifiée (recherche flexible)
            if (criteres.activite) {
                const activiteLower = tacheData.activite?.toLowerCase() || '';
                const lieuLower = tacheData.lieu?.toLowerCase() || '';
                const critereLower = criteres.activite.toLowerCase();
                
                // Chercher dans activité OU lieu
                const trouveDansActivite = activiteLower.includes(critereLower);
                const trouveDansLieu = lieuLower.includes(critereLower);
                
                if (!trouveDansActivite && !trouveDansLieu) {
                    correspond = false;
                }
            }
            
            // Filtrer par lieu si spécifié (en plus de l'activité)
            if (criteres.lieu) {
                const lieuLower = tacheData.lieu?.toLowerCase() || '';
                const critereLieuLower = criteres.lieu.toLowerCase();
                
                if (!lieuLower.includes(critereLieuLower)) {
                    correspond = false;
                }
            }
            
            if (correspond) {
                taches.push(tacheData);
            }
        });
        
        console.log(`🔍 ${taches.length} tâche(s) trouvée(s)`);
        return taches;
        
    } catch (error) {
        console.error('❌ Erreur recherche Firestore:', error);
        throw error;
    }
}

/**
 * Supprime des tâches par leurs IDs
 */
export async function supprimerTaches(tacheIds) {
    try {
        const batch = db.batch();
        
        tacheIds.forEach(id => {
            const docRef = db.collection('planning').doc(id);
            batch.delete(docRef);
        });
        
        await batch.commit();
        
        console.log(`✅ ${tacheIds.length} tâche(s) supprimée(s)`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur suppression Firestore:', error);
        throw error;
    }
}

/**
 * Modifie des tâches selon des critères
 */
export async function modifierTaches(tacheIds, modifications) {
    try {
        const batch = db.batch();
        
        const updateData = {
            ...modifications,
            updatedAt: new Date().toISOString()
        };
        
        // Retirer les champs null/undefined
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === null || updateData[key] === undefined) {
                delete updateData[key];
            }
        });
        
        tacheIds.forEach(id => {
            const docRef = db.collection('planning').doc(id);
            batch.update(docRef, updateData);
        });
        
        await batch.commit();
        
        console.log(`✅ ${tacheIds.length} tâche(s) modifiée(s)`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur modification Firestore:', error);
        throw error;
    }
}

/**
 * Met à jour le statut d'une tâche
 */
export async function mettreAJourStatus(tacheId, nouveauStatus) {
    try {
        await db.collection('planning').doc(tacheId).update({
            status: nouveauStatus,
            updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Statut mis à jour: ${nouveauStatus}`);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur mise à jour statut:', error);
        throw error;
    }
}

/**
 * Détecte les conflits de planning pour une personne à une date donnée
 */
export async function detecterConflits(tache) {
    try {
        if (!tache.personnes || tache.personnes.length === 0) {
            return []; // Pas de personnes = pas de conflit
        }
        
        const conflits = [];
        
        // Vérifier pour chaque personne
        for (const personne of tache.personnes) {
            const query = db.collection('planning')
                .where('date', '==', tache.date)
                .where('personnes', 'array-contains', personne);
            
            const snapshot = await query.get();
            
            snapshot.forEach(doc => {
                const tacheExistante = {
                    id: doc.id,
                    ...doc.data()
                };
                
                // Vérifier le chevauchement des plages horaires
                if (plagesHorairesChevauchent(tache, tacheExistante)) {
                    conflits.push({
                        personne: personne,
                        tacheExistante: tacheExistante
                    });
                }
            });
        }
        
        if (conflits.length > 0) {
            console.log(`⚠️ ${conflits.length} conflit(s) détecté(s)`);
        }
        
        return conflits;
        
    } catch (error) {
        console.error('❌ Erreur détection conflits:', error);
        throw error;
    }
}

/**
 * Vérifie si deux tâches ont des plages horaires qui se chevauchent
 */
function plagesHorairesChevauchent(tache1, tache2) {
    // Si l'une des deux est "journée complète" (heure = null), c'est un conflit
    if (tache1.heure === null || tache2.heure === null) {
        return true; // Une journée complète chevauche toujours
    }
    
    // Les deux ont des heures spécifiques
    // Pour simplifier : si les heures sont différentes de plus de 2h, pas de conflit
    // Sinon on considère qu'il peut y avoir chevauchement
    
    const heure1 = parseInt(tache1.heure.split(':')[0]);
    const heure2 = parseInt(tache2.heure.split(':')[0]);
    
    // Si les heures sont à plus de 3h d'intervalle, pas de chevauchement probable
    // (on suppose qu'une tâche dure en moyenne 2-3h)
    const ecartHeures = Math.abs(heure1 - heure2);
    
    if (ecartHeures >= 3) {
        return false; // Assez d'écart, pas de conflit
    }
    
    // Sinon, considérer comme un conflit potentiel
    return true;
}
