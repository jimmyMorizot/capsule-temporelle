/**
 * Capsule Temporelle - Frontend Manager
 * Gère les états dynamiques et l'interaction avec l'API REST
 */

export default class CapsuleManager {
    constructor() {
        this.container = document.getElementById('capsule-container');
        this.apiUrl = '/api/capsule';
        this.countdownInterval = null;
        this.currentState = 'loading';
    }

    /**
     * Initialize the application
     */
    async init() {
        await this.checkCapsuleStatus();
    }

    /**
     * Check capsule status via API
     */
    async checkCapsuleStatus() {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000) // 5s timeout
            });

            const data = await response.json();

            if (response.status === 404) {
                // No capsule exists - show creation form
                this.renderCreateForm();
            } else if (response.status === 403 && data.status === 'locked') {
                // Capsule locked - show countdown
                this.renderLockedCapsule(data);
            } else if (response.status === 200 && data.status === 'unlocked') {
                // Capsule unlocked - show message
                this.renderUnlockedCapsule(data);
            } else {
                this.renderError('État inattendu de la capsule');
            }
        } catch (error) {
            if (error.name === 'TimeoutError') {
                this.renderError('Le serveur met trop de temps à répondre');
            } else {
                this.renderError('Erreur de connexion au serveur');
            }
            console.error('API Error:', error);
        }
    }

    /**
     * Render creation form (state: no capsule / 404)
     */
    renderCreateForm() {
        this.currentState = 'create';
        this.stopCountdown();

        this.container.innerHTML = `
            <div class="card backdrop-blur-lg bg-white/10 border-white/20">
                <div class="card-header">
                    <h2 class="card-title text-white">Créer une capsule temporelle</h2>
                    <p class="card-description text-blue-100">
                        Écrivez un message qui sera déverrouillé à une date future
                    </p>
                </div>
                <div class="card-content">
                    <form id="capsule-form" class="space-y-4">
                        <div class="space-y-2">
                            <label for="message" class="label text-white">
                                Votre message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                class="textarea bg-white/5 border-white/20 text-white placeholder-blue-200"
                                placeholder="Écrivez votre message pour le futur..."
                                rows="6"
                                maxlength="5000"
                                required
                            ></textarea>
                            <div class="flex justify-between text-xs text-blue-200">
                                <span id="char-count">0 / 5000 caractères</span>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label for="unlockDate" class="label text-white">
                                Date de déverrouillage
                            </label>
                            <input
                                type="datetime-local"
                                id="unlockDate"
                                name="unlockDate"
                                class="input bg-white/5 border-white/20 text-white"
                                required
                            />
                            <p class="text-xs text-blue-200">
                                La capsule sera accessible à partir de cette date
                            </p>
                        </div>

                        <div id="form-error" class="hidden"></div>

                        <button
                            type="submit"
                            class="btn btn-default btn-md w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            🔒 Créer la capsule
                        </button>
                    </form>
                </div>
            </div>
        `;

        this.attachFormListeners();
    }

    /**
     * Render locked capsule with countdown (state: 403)
     */
    renderLockedCapsule(data) {
        this.currentState = 'locked';
        this.stopCountdown();

        const unlockDate = new Date(data.unlockDate);
        const formattedDate = this.formatDate(unlockDate);

        this.container.innerHTML = `
            <div class="card backdrop-blur-lg bg-white/10 border-white/20">
                <div class="card-header">
                    <div class="flex items-center justify-between">
                        <h2 class="card-title text-white">Capsule verrouillée</h2>
                        <span class="badge badge-secondary bg-yellow-500/20 text-yellow-200 border-yellow-400/30">
                            🔒 Verrouillée
                        </span>
                    </div>
                    <p class="card-description text-blue-100">
                        Cette capsule sera déverrouillée le ${formattedDate}
                    </p>
                </div>
                <div class="card-content">
                    <div class="alert bg-blue-500/10 border-blue-400/30">
                        <div class="alert-title text-white flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Temps restant
                        </div>
                        <div id="countdown" class="text-3xl font-bold text-white mt-4 font-mono">
                            Calcul...
                        </div>
                    </div>

                    <div class="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
                        <p class="text-sm text-blue-200">
                            💡 La capsule se déverrouillera automatiquement et vous pourrez lire votre message.
                        </p>
                    </div>
                </div>
            </div>
        `;

        this.startCountdown(unlockDate);
    }

    /**
     * Render unlocked capsule with message (state: 200)
     */
    renderUnlockedCapsule(data) {
        this.currentState = 'unlocked';
        this.stopCountdown();

        const createdDate = new Date(data.createdAt);
        const unlockedDate = new Date(data.unlockDate);

        this.container.innerHTML = `
            <div class="card backdrop-blur-lg bg-white/10 border-white/20">
                <div class="card-header">
                    <div class="flex items-center justify-between">
                        <h2 class="card-title text-white">Capsule déverrouillée</h2>
                        <span class="badge badge-default bg-green-500/20 text-green-200 border-green-400/30">
                            ✅ Déverrouillée
                        </span>
                    </div>
                    <p class="card-description text-blue-100">
                        Créée le ${this.formatDate(createdDate)} • Déverrouillée le ${this.formatDate(unlockedDate)}
                    </p>
                </div>
                <div class="card-content">
                    <div class="alert bg-green-500/10 border-green-400/30 mb-4">
                        <div class="alert-title text-white">
                            🎉 Votre message du passé
                        </div>
                    </div>

                    <div class="p-6 rounded-lg bg-white/5 border border-white/10">
                        <p class="text-white text-lg leading-relaxed whitespace-pre-wrap">${this.escapeHtml(data.message)}</p>
                    </div>
                </div>
                <div class="card-footer">
                    <button
                        id="create-new-btn"
                        class="btn btn-outline btn-md border-white/20 text-white hover:bg-white/10"
                    >
                        ➕ Créer une nouvelle capsule
                    </button>
                </div>
            </div>
        `;

        // Event listener for creating new capsule
        document.getElementById('create-new-btn')?.addEventListener('click', () => {
            this.renderCreateForm();
        });
    }

    /**
     * Render error state
     */
    renderError(message) {
        this.currentState = 'error';
        this.stopCountdown();

        this.container.innerHTML = `
            <div class="card backdrop-blur-lg bg-white/10 border-white/20">
                <div class="card-content">
                    <div class="alert alert-destructive bg-red-500/10 border-red-400/30">
                        <div class="alert-title text-red-200 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Erreur
                        </div>
                        <div class="alert-description text-red-100">
                            ${this.escapeHtml(message)}
                        </div>
                    </div>
                    <button
                        onclick="location.reload()"
                        class="btn btn-outline btn-md border-white/20 text-white hover:bg-white/10 mt-4"
                    >
                        🔄 Réessayer
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to the creation form
     */
    attachFormListeners() {
        const form = document.getElementById('capsule-form');
        const messageInput = document.getElementById('message');
        const charCount = document.getElementById('char-count');

        // Character counter
        messageInput?.addEventListener('input', (e) => {
            const count = e.target.value.length;
            charCount.textContent = `${count} / 5000 caractères`;
        });

        // Form submission
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitCapsule(new FormData(form));
        });
    }

    /**
     * Submit capsule creation
     */
    async submitCapsule(formData) {
        const message = formData.get('message').trim();
        const unlockDateInput = formData.get('unlockDate');

        // Client-side validation
        if (!message || message.length === 0) {
            this.showFormError('Le message ne peut pas être vide');
            return;
        }

        if (message.length > 5000) {
            this.showFormError('Le message ne peut pas dépasser 5000 caractères');
            return;
        }

        if (!unlockDateInput) {
            this.showFormError('Veuillez sélectionner une date de déverrouillage');
            return;
        }

        // Convert to ISO 8601 format with timezone
        const unlockDate = new Date(unlockDateInput);
        const now = new Date();

        if (unlockDate <= now) {
            this.showFormError('La date de déverrouillage doit être dans le futur');
            return;
        }

        // Format to ISO 8601 with timezone
        const unlockDateISO = this.toISOStringWithTimezone(unlockDate);

        const submitButton = document.querySelector('#capsule-form button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = '⏳ Création en cours...';

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    unlockDate: unlockDateISO
                }),
                signal: AbortSignal.timeout(5000)
            });

            const data = await response.json();

            if (response.ok) {
                // Success - reload to show locked state
                await this.checkCapsuleStatus();
            } else {
                // Server validation error
                const errorMsg = data.errors
                    ? Object.values(data.errors).join(', ')
                    : data.message || 'Erreur lors de la création';
                this.showFormError(errorMsg);
            }
        } catch (error) {
            if (error.name === 'TimeoutError') {
                this.showFormError('Le serveur met trop de temps à répondre');
            } else {
                this.showFormError('Erreur de connexion au serveur');
            }
            console.error('Submit Error:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    /**
     * Show form validation error
     */
    showFormError(message) {
        const errorDiv = document.getElementById('form-error');
        errorDiv.className = 'alert alert-destructive bg-red-500/10 border-red-400/30';
        errorDiv.innerHTML = `
            <div class="alert-description text-red-100 text-sm">
                ${this.escapeHtml(message)}
            </div>
        `;
    }

    /**
     * Start countdown timer
     */
    startCountdown(unlockDate) {
        this.stopCountdown(); // Clear any existing interval

        const updateCountdown = () => {
            const now = new Date();
            const diff = unlockDate - now;

            if (diff <= 0) {
                // Countdown finished - check status
                this.stopCountdown();
                this.checkCapsuleStatus();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const countdownEl = document.getElementById('countdown');
            if (countdownEl) {
                countdownEl.textContent = `${days}j ${hours}h ${minutes}m ${seconds}s`;
            }
        };

        updateCountdown(); // Initial update
        this.countdownInterval = setInterval(updateCountdown, 1000); // Update every second
    }

    /**
     * Stop countdown timer
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'long',
            timeStyle: 'short'
        }).format(date);
    }

    /**
     * Convert Date to ISO 8601 with timezone
     */
    toISOStringWithTimezone(date) {
        const offset = -date.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
        const minutes = String(Math.abs(offset) % 60).padStart(2, '0');

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${hours}:${minutes}`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const manager = new CapsuleManager();
        manager.init();
    });
} else {
    const manager = new CapsuleManager();
    manager.init();
}
