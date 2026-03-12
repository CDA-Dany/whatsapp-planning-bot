import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts.js';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyse un message WhatsApp avec Claude pour extraire les infos de planning
 * @param {string} message - Le message à analyser
 * @param {string} senderName - Nom de l'expéditeur
 * @param {Array} conversationContext - Historique de la conversation
 * @returns {Promise<Object>} - Résultat de l'analyse
 */
export async function analyzerMessage(message, senderName, conversationContext = []) {
    try {
        // Obtenir la date et heure actuelles
        const now = new Date();
        const currentDate = now.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentTime = now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Construire le prompt utilisateur avec date/heure
        const userPrompt = USER_PROMPT_TEMPLATE
            .replace('{CURRENT_DATE}', currentDate)
            .replace('{CURRENT_TIME}', currentTime)
            .replace('{MESSAGE}', message)
            .replace('{SENDER}', senderName);
        
        // Construire l'historique de conversation pour Claude
        const messages = [
            ...conversationContext,
            {
                role: 'user',
                content: userPrompt
            }
        ];
        
        // Appel à l'API Claude
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: messages
        });
        
        // Extraire le texte de la réponse
        let responseText = response.content[0].text;
        
        // Nettoyer les backticks markdown si présents
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parser la réponse JSON
        const result = JSON.parse(responseText);
        
        return result;
        
    } catch (error) {
        console.error('❌ Erreur API Claude:', error);
        
        // Si erreur de parsing JSON, retourner une action par défaut
        if (error instanceof SyntaxError) {
            console.error('⚠️ Erreur parsing JSON de Claude');
            console.error('Réponse brute:', error.message);
            return {
                action: 'ignorer',
                raison: 'Erreur de parsing de la réponse'
            };
        }
        
        throw error;
    }
}

/**
 * Teste la connexion à l'API Claude
 */
export async function testerConnexionClaude() {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: 'Réponds juste "OK" si tu me reçois.'
            }]
        });
        
        console.log('✅ Connexion Claude API réussie !');
        return true;
    } catch (error) {
        console.error('❌ Erreur connexion Claude:', error.message);
        return false;
    }
}
