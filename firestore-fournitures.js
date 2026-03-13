// Gestion des fournitures pour le bot WhatsApp
import admin from 'firebase-admin';

// Utiliser l'instance Firebase déjà initialisée
const db = admin.firestore();

// ========================
// GESTION FOURNITURES
// ========================

/**
 * Recherche une fourniture dans un chantier par nom (avec correspondance floue)
 */
export async function rechercherFourniture(chantier, nomFourniture) {
    try {
        const nomNormalise = normaliserNomFourniture(nomFourniture);
        
        // Utiliser le nom du chantier en minuscules (doit correspondre au nom du fichier CSV)
        const collectionNom = chantier.toLowerCase();
        
        console.log(`🔍 Recherche "${nomNormalise}" dans collection "${collectionNom}"`);
        
        // Récupérer toutes les fournitures du chantier
        const snapshot = await db.collection(collectionNom).get();
        
        if (snapshot.empty) {
            console.log(`❌ Aucune fourniture dans le chantier ${chantier}`);
            return null;
        }
        
        // Chercher correspondance
        let meilleurMatch = null;
        let meilleureScore = 0;
        
        snapshot.forEach(doc => {
            const fourniture = { id: doc.id, ...doc.data() };
            const score = calculerScore(nomNormalise, fourniture.nom);
            
            if (score > meilleureScore) {
                meilleureScore = score;
                meilleurMatch = fourniture;
            }
        });
        
        // Accepter si score >= 0.5
        if (meilleureScore >= 0.5) {
            console.log(`✅ Trouvé: ${meilleurMatch.nom} (score: ${meilleureScore})`);
            return { ...meilleurMatch, collection: collectionNom };
        }
        
        console.log(`❌ Aucune correspondance (meilleur score: ${meilleureScore})`);
        return null;
        
    } catch (error) {
        console.error('❌ Erreur recherche fourniture:', error);
        throw error;
    }
}

/**
 * Ajouter une quantité à une fourniture
 */
export async function ajouterQuantiteFourniture(fournitureId, quantite, collectionNom) {
    try {
        const fournitureRef = db.collection(collectionNom).doc(fournitureId);
        
        // Récupérer fourniture actuelle
        const doc = await fournitureRef.get();
        if (!doc.exists) {
            throw new Error('Fourniture non trouvée');
        }
        
        const fourniture = doc.data();
        const nouvelleQuantite = (fourniture.quantite_utilisee || 0) + quantite;
        
        // Mettre à jour
        await fournitureRef.update({
            quantite_utilisee: nouvelleQuantite,
            derniere_modification: new Date().toISOString()
        });
        
        console.log(`✅ Quantité ajoutée: +${quantite} → total: ${nouvelleQuantite}`);
        
        return {
            nom: fourniture.nom,
            quantite_ajoutee: quantite,
            quantite_utilisee: nouvelleQuantite,
            quantite_prevue: fourniture.quantite
        };
        
    } catch (error) {
        console.error('❌ Erreur ajout quantité:', error);
        throw error;
    }
}

// ========================
// FONCTIONS UTILITAIRES
// ========================

function normaliserNomFourniture(nom) {
    return nom.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function calculerScore(nomRecherche, nomFourniture) {
    const nomNorm = normaliserNomFourniture(nomFourniture);
    
    // Correspondance exacte
    if (nomNorm === nomRecherche) {
        return 1.0;
    }
    
    // Correspondance partielle
    if (nomNorm.includes(nomRecherche) || nomRecherche.includes(nomNorm)) {
        return 0.8;
    }
    
    // Distance de Levenshtein simplifiée
    const distance = calculerDistanceLevenshtein(nomRecherche, nomNorm);
    const maxLen = Math.max(nomRecherche.length, nomNorm.length);
    return 1 - (distance / maxLen);
}

function calculerDistanceLevenshtein(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}
