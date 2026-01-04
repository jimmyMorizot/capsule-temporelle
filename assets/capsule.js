/**
 * Capsule Temporelle - Frontend Manager
 * Gère les états dynamiques et l'interaction avec l'API REST
 */

import confetti from 'canvas-confetti';

export default class CapsuleManager {
    constructor() {
        this.container = document.getElementById('capsule-container');
        this.apiUrl = '/api/capsule';
        this.countdownInterval = null;
        this.currentState = 'loading';
        this.notificationTimeouts = []; // Store notification timeouts
        this.notificationsSupported = 'Notification' in window;
    }

    /**
     * Initialize the application
     */
    async init() {
        await this.checkCapsuleStatus();
    }

    /**
     * Check and request notification permission
     */
    checkNotificationPermission() {
        if (!this.notificationsSupported) return;

        const preference = localStorage.getItem('notificationPreference');

        // Don't ask again if user previously denied
        if (preference === 'denied') return;

        // Request permission if not already granted or denied
        if (Notification.permission === 'default' && !preference) {
            this.showNotificationPermissionAlert();
        }
    }

    /**
     * Show notification permission alert
     */
    showNotificationPermissionAlert() {
        // Only show if we're in locked state (has a capsule waiting)
        if (this.currentState !== 'locked') return;

        const alertHtml = `
            <div id="notification-alert" class="mb-4 backdrop-blur-lg bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                    <span class="text-2xl">🔔</span>
                    <div class="flex-1">
                        <h4 class="text-white font-semibold mb-1">Recevoir des notifications ?</h4>
                        <p class="text-blue-200 text-sm mb-3">
                            Soyez prévenu 1h avant et au moment du déverrouillage de votre capsule
                        </p>
                        <div class="flex gap-2">
                            <button id="allow-notifications" class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white">
                                Autoriser
                            </button>
                            <button id="deny-notifications" class="btn btn-outline btn-sm bg-white/5 border-white/20 text-white">
                                Plus tard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert alert before the main card
        this.container.insertAdjacentHTML('beforebegin', alertHtml);

        // Attach event listeners
        document.getElementById('allow-notifications')?.addEventListener('click', async () => {
            const permission = await Notification.requestPermission();
            localStorage.setItem('notificationPreference', permission);
            document.getElementById('notification-alert')?.remove();

            if (permission === 'granted') {
                this.scheduleNotifications();
            }
        });

        document.getElementById('deny-notifications')?.addEventListener('click', () => {
            localStorage.setItem('notificationPreference', 'later');
            document.getElementById('notification-alert')?.remove();
        });
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
            <div class="card backdrop-blur-xl bg-white/10 border-white/30 shadow-purple animate-fade-in-up">
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
                                class="textarea bg-white/5 border-white/20 text-white placeholder-blue-200 transition-colors duration-300"
                                placeholder="Écrivez votre message pour le futur..."
                                rows="6"
                                maxlength="5000"
                                required
                            ></textarea>
                            <div class="flex justify-between text-xs">
                                <span id="message-validation-status" class="text-blue-200"></span>
                                <span id="char-count" class="text-green-400">0 / 5000 caractères</span>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label for="unlockDate" class="label text-white">
                                Date de déverrouillage
                            </label>
                            <div class="relative">
                                <input
                                    type="datetime-local"
                                    id="unlockDate"
                                    name="unlockDate"
                                    class="input bg-white/5 border-white/20 text-white transition-colors duration-300 pr-10"
                                    required
                                />
                                <span id="date-validation-icon" class="absolute right-3 top-1/2 -translate-y-1/2 text-xl hidden"></span>
                            </div>
                            <p id="date-validation-message" class="text-sm hidden"></p>

                            <div class="grid grid-cols-2 gap-2 mt-2">
                                <button type="button" data-quick-date="1d" class="btn btn-outline btn-sm bg-white/5 border-white/20 text-white hover:bg-white/10">
                                    +1 jour
                                </button>
                                <button type="button" data-quick-date="1w" class="btn btn-outline btn-sm bg-white/5 border-white/20 text-white hover:bg-white/10">
                                    +1 semaine
                                </button>
                                <button type="button" data-quick-date="1m" class="btn btn-outline btn-sm bg-white/5 border-white/20 text-white hover:bg-white/10">
                                    +1 mois
                                </button>
                                <button type="button" data-quick-date="1y" class="btn btn-outline btn-sm bg-white/5 border-white/20 text-white hover:bg-white/10">
                                    +1 an
                                </button>
                            </div>

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
        const createdAt = data.createdAt ? new Date(data.createdAt) : null;
        const formattedDate = this.formatDate(unlockDate);

        this.container.innerHTML = `
            <div class="card backdrop-blur-xl bg-white/10 border-white/30 shadow-purple animate-fade-in-up" data-unlock-date="${data.unlockDate}">
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
                        <div id="countdown" class="text-3xl font-bold text-white mt-4 font-mono transition-all duration-300">
                            Calcul...
                        </div>
                        <div id="exact-date" class="text-sm text-white/60 mt-2 hidden transition-opacity duration-300">
                        </div>
                        ${createdAt ? `
                        <div class="mt-4">
                            <div class="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                <div id="progress-bar" class="h-full transition-all duration-1000 ease-linear" style="width: 0%"></div>
                            </div>
                            <p class="text-xs text-blue-200 mt-2 text-center">
                                <span id="progress-text">0%</span> du temps écoulé
                            </p>
                        </div>
                        ` : ''}
                    </div>

                    <div class="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
                        <p class="text-sm text-blue-200">
                            💡 La capsule se déverrouillera automatiquement et vous pourrez lire votre message.
                        </p>
                    </div>
                </div>
                <div class="card-footer">
                    <button
                        id="delete-capsule-btn"
                        class="btn btn-outline btn-sm bg-red-500/10 border-red-400/30 text-red-300 hover:bg-red-500/20"
                    >
                        🗑️ Supprimer la capsule
                    </button>
                </div>
            </div>
        `;

        // Event listener for delete button
        document.getElementById('delete-capsule-btn')?.addEventListener('click', () => {
            this.deleteCapsule();
        });

        this.startCountdown(unlockDate, createdAt);

        // Check and request notification permission
        this.checkNotificationPermission();

        // Schedule notifications if permission granted
        if (Notification.permission === 'granted') {
            this.scheduleNotifications();
        }
    }

    /**
     * Render unlocked capsule with message (state: 200)
     */
    renderUnlockedCapsule(data) {
        this.currentState = 'unlocked';
        this.stopCountdown();

        const createdDate = new Date(data.createdAt);
        const unlockedDate = new Date(data.unlockDate);

        // Trigger confetti celebration!
        this.triggerConfetti();

        this.container.innerHTML = `
            <div class="card backdrop-blur-xl bg-white/10 border-white/30 shadow-purple animate-fade-in-up">
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
                <div class="card-footer flex gap-2">
                    <button
                        id="copy-message-btn"
                        class="btn btn-outline btn-md bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                        📋 Copier le message
                    </button>
                    <button
                        id="create-new-btn"
                        class="btn btn-outline btn-md bg-white/5 border-white/20 text-white hover:bg-white/10"
                    >
                        ➕ Créer une nouvelle capsule
                    </button>
                </div>
            </div>
        `;

        // Event listener for copying message
        document.getElementById('copy-message-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('copy-message-btn');
            if (!btn || btn.disabled) return;

            const originalText = btn.textContent;

            // Disable button to prevent spam
            btn.disabled = true;

            try {
                // Try modern Clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(data.message);
                } else {
                    // Fallback to execCommand for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = data.message;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();

                    const success = document.execCommand('copy');
                    document.body.removeChild(textarea);

                    if (!success) {
                        throw new Error('execCommand failed');
                    }
                }

                // Visual feedback: change button text temporarily
                btn.textContent = '✅ Copié !';
                btn.classList.add('bg-green-500/20', 'border-green-400/30');

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('bg-green-500/20', 'border-green-400/30');
                    btn.disabled = false;
                }, 2000);
            } catch (error) {
                console.error('Copy failed:', error);
                btn.textContent = '❌ Erreur';
                btn.classList.add('bg-red-500/20', 'border-red-400/30');

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('bg-red-500/20', 'border-red-400/30');
                    btn.disabled = false;
                }, 2000);
            }
        });

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
            <div class="card backdrop-blur-xl bg-white/10 border-white/30 shadow-purple">
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

        // Character counter with dynamic colors
        messageInput?.addEventListener('input', (e) => {
            const count = e.target.value.length;
            charCount.textContent = `${count} / 5000 caractères`;

            // Dynamic color based on character count
            if (count < 4000) {
                charCount.className = 'text-xs text-green-400';
            } else if (count < 4800) {
                charCount.className = 'text-xs text-orange-400';
            } else {
                charCount.className = 'text-xs text-red-400';
            }
        });

        // Quick date buttons
        const quickDateButtons = document.querySelectorAll('[data-quick-date]');
        const unlockDateInput = document.getElementById('unlockDate');
        const submitButton = document.querySelector('#capsule-form button[type="submit"]');

        quickDateButtons.forEach(button => {
            button.addEventListener('click', () => {
                const type = button.dataset.quickDate;
                const now = new Date();

                switch(type) {
                    case '1d':
                        now.setDate(now.getDate() + 1);
                        break;
                    case '1w':
                        now.setDate(now.getDate() + 7);
                        break;
                    case '1m':
                        now.setMonth(now.getMonth() + 1);
                        break;
                    case '1y':
                        now.setFullYear(now.getFullYear() + 1);
                        break;
                }

                // Format for datetime-local input (YYYY-MM-DDTHH:mm)
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');

                unlockDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;

                // Trigger validation after setting value
                this.validateForm();
            });
        });

        // Real-time validation on date change/input
        unlockDateInput?.addEventListener('change', () => {
            this.validateForm();
        });
        unlockDateInput?.addEventListener('input', () => {
            this.validateForm();
        });

        // Real-time validation on message change
        messageInput?.addEventListener('input', () => {
            this.validateForm();
        });

        // Form submission
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitCapsule(new FormData(form));
        });
    }

    /**
     * Validate form in real-time and provide visual feedback
     */
    validateForm() {
        const messageInput = document.getElementById('message');
        const unlockDateInput = document.getElementById('unlockDate');
        const submitButton = document.querySelector('#capsule-form button[type="submit"]');

        let isValid = true;

        // Validate message
        const messageValid = this.validateMessageInput(messageInput);
        if (!messageValid) {
            isValid = false;
        }

        // Validate date
        const dateValid = this.validateDateInput(unlockDateInput);
        if (!dateValid) {
            isValid = false;
        }

        // Enable/disable submit button with tooltip
        if (submitButton) {
            submitButton.disabled = !isValid;
            if (!isValid) {
                submitButton.classList.add('opacity-50', 'cursor-not-allowed');
                submitButton.setAttribute('title', 'Veuillez remplir tous les champs correctement');
            } else {
                submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
                submitButton.removeAttribute('title');
            }
        }
    }

    /**
     * Validate message input with visual feedback
     */
    validateMessageInput(messageInput) {
        if (!messageInput) return false;

        const message = messageInput.value.trim();
        const messageStatus = document.getElementById('message-validation-status');

        let isValid = true;

        if (message.length === 0) {
            // Empty message
            isValid = false;
            messageInput.classList.remove('border-green-500', 'border-white/20');
            messageInput.classList.add('border-red-500');
            if (messageStatus) {
                messageStatus.textContent = '';
                messageStatus.className = 'text-sm';
            }
        } else if (message.length > 5000) {
            // Too long
            isValid = false;
            messageInput.classList.remove('border-green-500', 'border-white/20');
            messageInput.classList.add('border-red-500');
            if (messageStatus) {
                messageStatus.textContent = '❌ Message trop long';
                messageStatus.className = 'text-sm text-red-400';
            }
        } else {
            // Valid
            messageInput.classList.remove('border-red-500', 'border-white/20');
            messageInput.classList.add('border-green-500');
            if (messageStatus) {
                messageStatus.textContent = '✓ Message valide';
                messageStatus.className = 'text-sm text-green-400';
            }
        }

        return isValid;
    }

    /**
     * Validate date input with visual feedback
     */
    validateDateInput(unlockDateInput) {
        if (!unlockDateInput) return false;

        const dateIcon = document.getElementById('date-validation-icon');
        const dateMessage = document.getElementById('date-validation-message');

        let isValid = true;

        if (!unlockDateInput.value) {
            // No date selected
            isValid = false;
            unlockDateInput.classList.remove('border-green-500', 'border-red-500');
            unlockDateInput.classList.add('border-white/20');
            if (dateIcon) {
                dateIcon.classList.add('hidden');
            }
            if (dateMessage) {
                dateMessage.classList.add('hidden');
            }
        } else {
            const selectedDate = new Date(unlockDateInput.value);
            const now = new Date();

            if (selectedDate <= now) {
                // Date in the past
                isValid = false;
                unlockDateInput.classList.remove('border-green-500', 'border-white/20');
                unlockDateInput.classList.add('border-red-500');

                if (dateIcon) {
                    dateIcon.textContent = '❌';
                    dateIcon.classList.remove('hidden');
                }

                if (dateMessage) {
                    dateMessage.textContent = 'La date doit être dans le futur';
                    dateMessage.className = 'text-sm text-red-400';
                    dateMessage.classList.remove('hidden');
                }
            } else {
                // Valid date
                unlockDateInput.classList.remove('border-red-500', 'border-white/20');
                unlockDateInput.classList.add('border-green-500');

                if (dateIcon) {
                    dateIcon.textContent = '✓';
                    dateIcon.classList.remove('hidden');
                }

                if (dateMessage) {
                    dateMessage.textContent = 'Date valide ✓';
                    dateMessage.className = 'text-sm text-green-400';
                    dateMessage.classList.remove('hidden');
                }
            }
        }

        return isValid;
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
    startCountdown(unlockDate, createdAt = null) {
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

            const countdownData = this.formatCountdownSmart(days, hours, minutes, seconds);
            const countdownEl = document.getElementById('countdown');
            const exactDateEl = document.getElementById('exact-date');

            if (countdownEl) {
                // Fade out, update, fade in for smooth transition
                const oldText = countdownEl.textContent;
                if (oldText !== countdownData.text) {
                    countdownEl.style.opacity = '0';
                    setTimeout(() => {
                        countdownEl.textContent = countdownData.text;
                        countdownEl.className = `text-3xl font-bold mt-4 font-mono transition-all duration-300 ${countdownData.color}`;
                        countdownEl.style.opacity = '1';
                    }, 150);
                } else {
                    countdownEl.textContent = countdownData.text;
                    countdownEl.className = `text-3xl font-bold mt-4 font-mono transition-all duration-300 ${countdownData.color}`;
                }
            }

            // Show/hide exact date
            if (exactDateEl) {
                if (countdownData.showExactDate) {
                    exactDateEl.textContent = this.formatExactDate(unlockDate);
                    exactDateEl.classList.remove('hidden');
                } else {
                    exactDateEl.classList.add('hidden');
                }
            }

            // Update progress bar if createdAt is available
            if (createdAt) {
                this.updateProgressBar(now, createdAt, unlockDate);
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
     * Format countdown with intelligent formatting based on time remaining
     * Returns object with text, color, and whether to show exact date
     */
    formatCountdownSmart(days, hours, minutes, seconds) {
        const totalMinutes = days * 24 * 60 + hours * 60 + minutes;

        // < 5 minutes: URGENT (no pulse animation - too annoying)
        if (totalMinutes < 5) {
            return {
                text: `BIENTÔT ! ${minutes}m ${seconds}s`,
                color: 'text-red-500',
                showExactDate: false
            };
        }

        // < 1 hour: show minutes and seconds
        if (days === 0 && hours === 0) {
            return {
                text: `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} seconde${seconds > 1 ? 's' : ''}`,
                color: 'text-orange-500',
                showExactDate: false
            };
        }

        // < 24 hours: show hours, minutes, seconds
        if (days === 0) {
            return {
                text: `${hours} heure${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} seconde${seconds > 1 ? 's' : ''}`,
                color: 'text-yellow-400',
                showExactDate: false
            };
        }

        // > 7 days: show days and hours + exact date below
        if (days > 7) {
            return {
                text: `${days} jour${days > 1 ? 's' : ''} ${hours} heure${hours > 1 ? 's' : ''}`,
                color: 'text-blue-400',
                showExactDate: true
            };
        }

        // 1-7 days: compact format
        return {
            text: `${days}j ${hours}h ${minutes}m`,
            color: 'text-purple-400',
            showExactDate: false
        };
    }

    /**
     * Format exact date in French locale
     */
    formatExactDate(unlockDate) {
        const formatter = new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const formatted = formatter.format(unlockDate);
        // Capitalize first letter
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    /**
     * Update progress bar with dynamic colors
     */
    updateProgressBar(now, createdAt, unlockDate) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        if (!progressBar || !progressText) return;

        // Calculate progress: (now - createdAt) / (unlockDate - createdAt) * 100
        const totalDuration = unlockDate - createdAt;
        const elapsed = now - createdAt;
        const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        // Update width
        progressBar.style.width = `${progress}%`;

        // Update text
        progressText.textContent = `${Math.round(progress)}%`;

        // Dynamic colors based on progress
        if (progress < 33) {
            // Green (early stage)
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        } else if (progress < 66) {
            // Yellow/Orange (middle stage)
            progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
            // Red (final stage)
            progressBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Trigger confetti celebration animation
     */
    triggerConfetti() {
        const duration = 3000; // 3 seconds
        const end = Date.now() + duration;

        const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    /**
     * Delete current capsule with confirmation
     */
    async deleteCapsule() {
        // Ask for confirmation
        const confirmed = confirm(
            '⚠️ Êtes-vous sûr de vouloir supprimer cette capsule ?\n\n' +
            'Cette action est irréversible et vous perdrez votre message.'
        );

        if (!confirmed) {
            return;
        }

        try {
            // Delete via API (DELETE method)
            const response = await fetch(this.apiUrl, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                // Success - show creation form
                this.renderCreateForm();
            } else {
                // Fallback: try manual file deletion via backend
                // If DELETE endpoint doesn't exist, just reload
                location.reload();
            }
        } catch (error) {
            console.error('Delete error:', error);
            // Fallback: reload page
            location.reload();
        }
    }

    /**
     * Schedule notifications for locked capsule
     */
    scheduleNotifications() {
        if (!this.notificationsSupported || Notification.permission !== 'granted') return;
        if (this.currentState !== 'locked') return;

        // Clear any existing timeouts
        this.clearNotificationTimeouts();

        // Get unlock date from current locked capsule
        const unlockDateElement = document.querySelector('[data-unlock-date]');
        if (!unlockDateElement) return;

        const unlockDate = new Date(unlockDateElement.dataset.unlockDate);
        const now = new Date();
        const timeUntilUnlock = unlockDate - now;

        // Schedule notification 1 hour before (if more than 1h remaining)
        const oneHourBefore = timeUntilUnlock - (60 * 60 * 1000);
        if (oneHourBefore > 0) {
            const timeout1h = setTimeout(() => {
                this.sendNotification(
                    '🕰️ Capsule bientôt déverrouillée !',
                    'Votre capsule temporelle sera accessible dans 1 heure',
                    false
                );
            }, oneHourBefore);
            this.notificationTimeouts.push(timeout1h);
        }

        // Schedule notification at exact unlock time
        if (timeUntilUnlock > 0) {
            const timeoutUnlock = setTimeout(() => {
                this.sendNotification(
                    '🎉 Capsule déverrouillée !',
                    'Votre message du passé est maintenant accessible',
                    true
                );
                // Recheck status to update UI
                this.checkCapsuleStatus();
            }, timeUntilUnlock);
            this.notificationTimeouts.push(timeoutUnlock);
        }
    }

    /**
     * Send browser notification
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {boolean} requireInteraction - Whether notification requires interaction
     */
    sendNotification(title, body, requireInteraction = false) {
        if (!this.notificationsSupported || Notification.permission !== 'granted') return;

        try {
            const notification = new Notification(title, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                requireInteraction,
                tag: 'capsule-temporelle',
                renotify: true
            });

            // Click handler to focus window
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    /**
     * Clear all scheduled notification timeouts
     */
    clearNotificationTimeouts() {
        this.notificationTimeouts.forEach(timeout => clearTimeout(timeout));
        this.notificationTimeouts = [];
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
