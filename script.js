// PWA & Offline Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered:', reg))
            .catch(err => console.log('Service Worker error:', err));
    });
}

// Check online/offline status
function updateOnlineStatus() {
    const indicator = document.getElementById('offlineIndicator');
    if (!navigator.onLine) {
        if (!indicator) {
            const div = document.createElement('div');
            div.id = 'offlineIndicator';
            div.className = 'offline-indicator';
            div.innerHTML = '<i class="fas fa-wifi"></i> Anda sedang offline, data akan tersimpan saat online kembali';
            document.body.insertBefore(div, document.body.firstChild);
            setTimeout(() => div.classList.add('show'), 100);
        }
    } else {
        const indicator = document.getElementById('offlineIndicator');
        if (indicator) {
            indicator.classList.remove('show');
            setTimeout(() => indicator.remove(), 300);
        }
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();


// Data Transaksi
let transaksiList = [];
let currentCart = [];
let nextId = 1;

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    
    // Load sesuai halaman
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        updateDashboard();
        updateDateTime();
        setInterval(updateDateTime, 1000);
    } else if (window.location.pathname.includes('order.html')) {
        initOrderPage();
    } else if (window.location.pathname.includes('riwayat.html')) {
        initRiwayatPage();
    } else if (window.location.pathname.includes('nota.html')) {
        loadNotaData();
    }
});

// LocalStorage
function loadFromLocalStorage() {
    const savedTransaksi = localStorage.getItem('percetakan_transaksi');
    if (savedTransaksi) {
        transaksiList = JSON.parse(savedTransaksi);
        const savedId = localStorage.getItem('percetakan_nextId');
        if (savedId) nextId = parseInt(savedId);
    }
}

function saveToLocalStorage() {
    localStorage.setItem('percetakan_transaksi', JSON.stringify(transaksiList));
    localStorage.setItem('percetakan_nextId', nextId.toString());
}

function saveCartToLocalStorage() {
    localStorage.setItem('percetakan_cart', JSON.stringify(currentCart));
}

function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('percetakan_cart');
    if (savedCart) {
        currentCart = JSON.parse(savedCart);
    } else {
        currentCart = [];
    }
}

// Dashboard Functions
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const todayTransaksi = transaksiList.filter(t => t.tanggal === today);
    
    document.getElementById('totalTransaksi').textContent = todayTransaksi.length;
    
    const totalPendapatan = todayTransaksi.reduce((sum, t) => sum + t.grandTotal, 0);
    document.getElementById('totalPendapatan').textContent = formatRupiah(totalPendapatan);
    
    const uniquePelanggan = new Set(todayTransaksi.map(t => t.namaPelanggan)).size;
    document.getElementById('totalPelanggan').textContent = uniquePelanggan;
    
    // Produk terlaris
    const productCount = {};
    transaksiList.forEach(transaksi => {
        transaksi.items.forEach(item => {
            productCount[item.jenis] = (productCount[item.jenis] || 0) + item.jumlah;
        });
    });
    let topProduct = '-';
    let maxCount = 0;
    for (const [product, count] of Object.entries(productCount)) {
        if (count > maxCount) {
            maxCount = count;
            topProduct = product;
        }
    }
    document.getElementById('produkTerlaris').textContent = maxCount > 0 ? `${topProduct} (${maxCount})` : '-';
    
    // Recent transactions
    const recentBody = document.getElementById('recentTransaksi');
    const recent5 = [...transaksiList].reverse().slice(0, 5);
    if (recent5.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada transaksi</td></tr>';
    } else {
        recentBody.innerHTML = recent5.map(t => `
            <tr>
                <td>${t.noTransaksi}</td>
                <td>${t.tanggal}</td>
                <td>${t.namaPelanggan}</td>
                <td>${formatRupiah(t.grandTotal)}</td>
            </tr>
        `).join('');
    }
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('dateTime').textContent = now.toLocaleString('id-ID');
}

// Order Page Functions
function initOrderPage() {
    loadCartFromLocalStorage();
    renderCart();
    
    document.getElementById('jumlah').addEventListener('input', updatePreviewTotal);
    document.getElementById('harga').addEventListener('input', updatePreviewTotal);
    document.getElementById('tambahKeranjangBtn').addEventListener('click', tambahKeKeranjang);
    document.getElementById('simpanTransaksiBtn').addEventListener('click', simpanTransaksi);
    document.getElementById('uangBayar').addEventListener('input', hitungKembalian);
}

function updatePreviewTotal() {
    const jumlah = parseInt(document.getElementById('jumlah').value) || 0;
    const harga = parseInt(document.getElementById('harga').value) || 0;
    const total = jumlah * harga;
    document.getElementById('previewTotal').textContent = formatRupiah(total);
}

function tambahKeKeranjang() {
    const namaPelanggan = document.getElementById('namaPelanggan').value;
    if (!namaPelanggan) {
        alert('Masukkan nama pelanggan terlebih dahulu!');
        return;
    }
    
    const jenis = document.getElementById('jenisLayanan').value;
    const ukuran = document.getElementById('ukuran').value;
    const jumlah = parseInt(document.getElementById('jumlah').value) || 0;
    const harga = parseInt(document.getElementById('harga').value) || 0;
    
    if (jumlah <= 0 || harga <= 0) {
        alert('Jumlah dan harga harus lebih dari 0!');
        return;
    }
    
    const item = {
        id: Date.now(),
        jenis,
        ukuran,
        jumlah,
        harga,
        subtotal: jumlah * harga
    };
    
    currentCart.push(item);
    saveCartToLocalStorage();
    renderCart();
    
    // Reset form
    document.getElementById('jumlah').value = 1;
    document.getElementById('harga').value = '';
    document.getElementById('ukuran').value = '';
    updatePreviewTotal();
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;
    
    if (currentCart.length === 0) {
        cartContainer.innerHTML = '<div class="empty-cart">Keranjang masih kosong</div>';
        document.getElementById('grandTotal').textContent = formatRupiah(0);
        return;
    }
    
    cartContainer.innerHTML = `
        <div class="cart-item cart-item-header">
            <span>Jenis</span>
            <span>Ukuran</span>
            <span>Jumlah</span>
            <span>Harga</span>
            <span>Aksi</span>
        </div>
        ${currentCart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <span>${item.jenis}</span>
                <span>${item.ukuran || '-'}</span>
                <input type="number" value="${item.jumlah}" min="1" class="edit-jumlah" data-id="${item.id}">
                <span>${formatRupiah(item.harga)}</span>
                <button class="btn-danger hapus-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('')}
    `;
    
    // Event listeners untuk edit jumlah
    document.querySelectorAll('.edit-jumlah').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const newJumlah = parseInt(e.target.value);
            const item = currentCart.find(i => i.id === id);
            if (item && newJumlah > 0) {
                item.jumlah = newJumlah;
                item.subtotal = item.jumlah * item.harga;
                saveCartToLocalStorage();
                renderCart();
            }
        });
    });
    
    document.querySelectorAll('.hapus-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            currentCart = currentCart.filter(item => item.id !== id);
            saveCartToLocalStorage();
            renderCart();
        });
    });
    
    const grandTotal = currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    document.getElementById('grandTotal').textContent = formatRupiah(grandTotal);
    hitungKembalian();
}

function hitungKembalian() {
    const grandTotal = currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    const uangBayar = parseInt(document.getElementById('uangBayar')?.value) || 0;
    const kembalian = uangBayar - grandTotal;
    const kembalianSpan = document.getElementById('kembalian');
    if (kembalianSpan) {
        kembalianSpan.textContent = kembalian >= 0 ? formatRupiah(kembalian) : formatRupiah(0);
    }
}

function simpanTransaksi() {
    const namaPelanggan = document.getElementById('namaPelanggan').value;
    const nomorHp = document.getElementById('nomorHp').value;
    const metodeBayar = document.getElementById('metodeBayar').value;
    const uangBayar = parseInt(document.getElementById('uangBayar').value) || 0;
    const grandTotal = currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    
    if (!namaPelanggan) {
        alert('Masukkan nama pelanggan!');
        return;
    }
    
    if (currentCart.length === 0) {
        alert('Keranjang masih kosong!');
        return;
    }
    
    if (uangBayar < grandTotal) {
        alert('Uang bayar kurang!');
        return;
    }
    
    const transaksi = {
        id: nextId++,
        noTransaksi: `TRX/${new Date().getFullYear()}/${String(nextId-1).padStart(4,'0')}`,
        tanggal: new Date().toISOString().split('T')[0],
        waktu: new Date().toLocaleTimeString('id-ID'),
        namaPelanggan,
        nomorHp,
        items: [...currentCart],
        grandTotal,
        metodeBayar,
        uangBayar,
        kembalian: uangBayar - grandTotal
    };
    
    transaksiList.unshift(transaksi);
    saveToLocalStorage();
    
    // Simpan transaksi terakhir untuk nota
    localStorage.setItem('percetakan_last_transaksi', JSON.stringify(transaksi));
    
    // Reset
    currentCart = [];
    saveCartToLocalStorage();
    document.getElementById('namaPelanggan').value = '';
    document.getElementById('nomorHp').value = '';
    document.getElementById('uangBayar').value = '';
    renderCart();
    
    alert('Transaksi berhasil disimpan!');
    
    // Redirect ke nota
    window.location.href = 'nota.html';
}

// Riwayat Page Functions
function initRiwayatPage() {
    renderRiwayatTable();
    
    document.getElementById('hapusSemuaBtn')?.addEventListener('click', () => {
        if (confirm('Hapus semua transaksi?')) {
            transaksiList = [];
            nextId = 1;
            saveToLocalStorage();
            renderRiwayatTable();
            alert('Semua transaksi dihapus!');
        }
    });
    
    // Modal events
    const modal = document.getElementById('detailModal');
    const closeModal = document.querySelector('.close-modal');
    const tutupModal = document.getElementById('tutupModalBtn');
    
    if (closeModal) closeModal.onclick = () => modal.style.display = 'none';
    if (tutupModal) tutupModal.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

function renderRiwayatTable() {
    const tbody = document.getElementById('riwayatTableBody');
    if (!tbody) return;
    
    if (transaksiList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Belum ada transaksi</td></tr>';
        return;
    }
    
    tbody.innerHTML = transaksiList.map(t => `
        <tr>
            <td>${t.noTransaksi}</td>
            <td>${t.tanggal} ${t.waktu}</td>
            <td>${t.namaPelanggan}</td>
            <td>${t.items.length} item</td>
            <td>${formatRupiah(t.grandTotal)}</td>
            <td>${t.metodeBayar}</td>
            <td>
                <button class="btn-secondary" onclick="lihatDetail(${t.id})" style="margin-right:5px">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-danger" onclick="hapusTransaksi(${t.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function lihatDetail(id) {
    const transaksi = transaksiList.find(t => t.id === id);
    if (!transaksi) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div style="font-size:14px">
            <p><strong>No Transaksi:</strong> ${transaksi.noTransaksi}</p>
            <p><strong>Tanggal:</strong> ${transaksi.tanggal} ${transaksi.waktu}</p>
            <p><strong>Pelanggan:</strong> ${transaksi.namaPelanggan}</p>
            <p><strong>No HP:</strong> ${transaksi.nomorHp || '-'}</p>
            <hr>
            <table style="width:100%; font-size:12px">
                <thead><tr><th>Item</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
                <tbody>
                    ${transaksi.items.map(item => `
                        <tr>
                            <td>${item.jenis} (${item.ukuran || '-'})</td>
                            <td>${item.jumlah}</td>
                            <td>${formatRupiah(item.harga)}</td>
                            <td>${formatRupiah(item.subtotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <hr>
            <p><strong>Total:</strong> ${formatRupiah(transaksi.grandTotal)}</p>
            <p><strong>Metode Bayar:</strong> ${transaksi.metodeBayar}</p>
            <p><strong>Bayar:</strong> ${formatRupiah(transaksi.uangBayar)}</p>
            <p><strong>Kembali:</strong> ${formatRupiah(transaksi.kembalian)}</p>
        </div>
    `;
    
    const modal = document.getElementById('detailModal');
    modal.style.display = 'block';
    
    document.getElementById('cetakNotaBtn').onclick = () => {
        localStorage.setItem('percetakan_last_transaksi', JSON.stringify(transaksi));
        window.location.href = 'nota.html';
    };
}

function hapusTransaksi(id) {
    if (confirm('Hapus transaksi ini?')) {
        transaksiList = transaksiList.filter(t => t.id !== id);
        saveToLocalStorage();
        renderRiwayatTable();
        alert('Transaksi dihapus!');
    }
}

// Nota Functions
function loadNotaData() {
    const lastTransaksi = localStorage.getItem('percetakan_last_transaksi');
    if (!lastTransaksi) {
        document.getElementById('notaContainer').innerHTML = '<p style="text-align:center">Tidak ada data nota</p>';
        return;
    }
    
    const t = JSON.parse(lastTransaksi);
    
    document.getElementById('notaTanggal').innerHTML = `${t.tanggal} ${t.waktu}`;
    document.getElementById('notaNoTransaksi').innerHTML = `No. ${t.noTransaksi}`;
    document.getElementById('notaPelanggan').innerHTML = `Pelanggan: ${t.namaPelanggan}`;
    
    const itemsBody = document.getElementById('notaItems');
    itemsBody.innerHTML = t.items.map(item => `
        <tr>
            <td>${item.jenis}<br><small>${item.ukuran || ''}</small></td>
            <td>${item.jumlah}</td>
            <td>${formatRupiah(item.harga)}</td>
            <td>${formatRupiah(item.subtotal)}</td>
        </tr>
    `).join('');
    
    document.getElementById('notaGrandTotal').textContent = formatRupiah(t.grandTotal);
    document.getElementById('notaMetode').textContent = t.metodeBayar;
    document.getElementById('notaBayar').textContent = formatRupiah(t.uangBayar);
    document.getElementById('notaKembali').textContent = formatRupiah(t.kembalian);
}

// Helper Functions
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Global functions for HTML
window.lihatDetail = lihatDetail;
window.hapusTransaksi = hapusTransaksi;