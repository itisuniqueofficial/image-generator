class ImageGenerator {
    constructor() {
        this.imageCache = new Map();
        this.debounceTimeout = null;
        this.isGenerating = false;
        this.cacheLimit = 5;

        this.elements = {
            promptInput: document.getElementById('promptInput'),
            image: document.getElementById('generatedImage'),
            spinner: document.getElementById('loadingSpinner'),
            error: document.getElementById('errorMessage'),
            regenerateBtn: document.getElementById('regenerateButton'),
            downloadBtn: document.getElementById('downloadButton')
        };

        this.elements.promptInput.addEventListener('input', this.debounce(this.handleInput.bind(this), 500));
        this.elements.promptInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.generateImage());
    }

    debounce(fn, delay) {
        return (...args) => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => fn(...args), delay);
        };
    }

    getPrompt() {
        const prompt = this.elements.promptInput.value.trim();
        return prompt.length > 2 ? prompt : null;
    }

    updateUI(state) {
        const states = {
            loading: { spinner: 'flex', image: false, buttons: 'none', error: 'none' },
            success: { spinner: 'none', image: true, buttons: 'block', error: 'none' },
            error: { spinner: 'none', image: false, buttons: 'none', error: 'block' },
            idle: { spinner: 'none', image: false, buttons: 'none', error: 'none' }
        };

        const current = states[state] || states.idle;
        this.elements.spinner.style.display = current.spinner;
        this.elements.image.classList.toggle('visible', current.image);
        this.elements.regenerateBtn.style.display = current.buttons;
        this.elements.downloadBtn.style.display = current.buttons;
        this.elements.error.style.display = current.error;

        if (!current.image) {
            this.elements.image.style.opacity = '0';
            this.elements.image.style.transform = 'scale(0.95)';
        }
    }

    showError(message) {
        this.elements.error.textContent = message;
        this.updateUI('error');
    }

    async generateImageUrl(prompt) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        
        try {
            const response = await fetch(
                `https://img.hazex.workers.dev/?prompt=${encodeURIComponent(prompt)}&improve=true&format=square&random=${Date.now()}`,
                { signal: controller.signal, cache: 'no-store' }
            );
            clearTimeout(timeout);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return response.url;
        } catch (error) {
            throw error.name === 'AbortError' ? new Error('Request timed out') : error;
        }
    }

    manageCache(prompt, url) {
        if (this.imageCache.size >= this.cacheLimit) {
            this.imageCache.delete(this.imageCache.keys().next().value);
        }
        this.imageCache.set(prompt, url);
    }

    async generateImage() {
        const prompt = this.getPrompt();
        if (!prompt || this.isGenerating) {
            if (!prompt) this.showError('Prompt must be at least 3 characters');
            return;
        }

        this.isGenerating = true;
        this.updateUI('loading');

        try {
            let imageUrl = this.imageCache.get(prompt);
            if (!imageUrl) {
                imageUrl = await this.generateImageUrl(prompt);
                this.manageCache(prompt, imageUrl);
            }

            await new Promise((resolve, reject) => {
                this.elements.image.onload = resolve;
                this.elements.image.onerror = () => reject(new Error('Image failed to load'));
                this.elements.image.src = imageUrl;
            });

            this.displayImage();
        } catch (error) {
            this.showError(error.message || 'Something went wrong');
        } finally {
            this.isGenerating = false;
        }
    }

    async regenerateImage() {
        const prompt = this.getPrompt();
        if (!prompt) return this.showError('Please enter a prompt');
        this.imageCache.delete(prompt);
        await this.generateImage();
    }

    displayImage() {
        this.updateUI('success');
        requestAnimationFrame(() => {
            this.elements.image.style.opacity = '1';
            this.elements.image.style.transform = 'scale(1)';
        });
    }

    downloadImage() {
        if (!this.elements.image.src) return this.showError('No image to download');
        
        const link = document.createElement('a');
        link.href = this.elements.image.src;
        link.download = `image_${Date.now()}.png`;
        link.click();
        link.remove();
    }

    handleInput() {
        const prompt = this.getPrompt();
        if (prompt && !this.isGenerating) {
            this.generateImage();
        } else if (!prompt) {
            this.updateUI('idle');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.imageGenerator = new ImageGenerator();
});

function generateImage() {
    window.imageGenerator.generateImage();
}

function regenerateImage() {
    window.imageGenerator.regenerateImage();
}

function downloadImage() {
    window.imageGenerator.downloadImage();
}