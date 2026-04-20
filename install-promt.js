// PWA Installation Prompt
let deferredPrompt;
const installContainer = document.createElement('div');
installContainer.id = 'install-prompt';
installContainer.innerHTML = `
    <div class="install-banner" style="display: none; position: fixed; bottom: 20px; left: 20px; right: 20px; background: linear-gradient(135deg, #1a56db, #1e40af); color: white; padding: 16px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1000; animation: slideUp 0.5s ease;">
        <div style="display: flex; align-items: center; gap: 15px;">
            <i class="fas fa-download" style="font-size: 32px;"></i>
            <div style="flex: 1;">
                <strong style="font-size: 16px;">Install Aplikasi</strong>
                <p style="font-size: 12px; margin: 5px 0 0;">Tambahkan ke home screen untuk akses cepat</p>
            </div>
            <button id="installBtn" style="background: white; color: #1a56db; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                Install
            </button>
            <button id="closeInstallBtn" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
        </div>
    </div>
`;
document.body.appendChild(installContainer);

const installBanner = document.querySelector('.install-banner');
const closeInstallBtn = document.getElementById('closeInstallBtn');
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Cek apakah sudah pernah dismiss
    if (!localStorage.getItem('installDismissed')) {
        installBanner.style.display = 'block';
    }
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            installBanner.style.display = 'none';
            localStorage.setItem('installDismissed', 'true');
        }
        deferredPrompt = null;
    }
});

closeInstallBtn.addEventListener('click', () => {
    installBanner.style.display = 'none';
    localStorage.setItem('installDismissed', 'true');
});

// Cek apakah sudah terinstall
window.addEventListener('appinstalled', () => {
    installBanner.style.display = 'none';
    localStorage.setItem('installDismissed', 'true');
});