// app/lib/validation/environmentValidation.ts

interface EnvValidationResult {
    isValid: boolean
    error?: string
}

export function validateCardGameEnvironment(env: any): EnvValidationResult {
    if (!env?.CARD_GAME_STATE_DO) {
        return {
        isValid: false,
        error: 'CARD_GAME_STATE_DO binding not found.'
        }
    }

    return { isValid: true }
}