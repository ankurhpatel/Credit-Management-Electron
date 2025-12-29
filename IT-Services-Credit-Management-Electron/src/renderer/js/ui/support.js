class SupportUI {
    static async search() {
        const query = document.getElementById('globalSupportSearch').value.trim().toLowerCase();
        const resultsBox = document.getElementById('supportSearchResults');

        if (query.length < 3) {
            resultsBox.style.display = 'none';
            return;
        }

        try {
            // We'll search subscriptions as they contain the MAC and link to Customer
            const response = await fetch(`/api/search/subscriptions?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            this.renderResults(data);
        } catch (error) {
            console.error('Support Search Error:', error);
        }
    }

    static renderResults(results) {
        const resultsBox = document.getElementById('supportSearchResults');
        
        if (results.length === 0) {
            resultsBox.innerHTML = '<div class="support-result-item">No matching customer or MAC found.</div>';
        } else {
            resultsBox.innerHTML = results.map(sub => {
                const expiry = new Date(sub.expiration_date || sub.ExpirationDate);
                const isExpired = expiry < new Date();
                const statusClass = isExpired ? 'status-expired' : 'status-active';
                const statusLabel = isExpired ? '❌ EXPIRED' : '✅ ACTIVE';

                return `
                    <div class="support-result-item">
                        <div class="support-result-header">
                            <strong>👤 ${sub.customer_name}</strong>
                            <span class="status-badge ${statusClass}">${statusLabel}</span>
                        </div>
                        <div class="support-result-details">
                            📺 ${sub.service_name} | 🖥️ ${sub.mac_address || 'No MAC'}<br>
                            📅 Expires: ${expiry.toLocaleDateString()}
                        </div>
                        <div class="support-result-actions">
                            <button onclick="SupportUI.openInPOS('${sub.customer_id}')" class="btn-small btn-primary">🛒 Renew</button>
                            <button onclick="SupportUI.viewDetails('${sub.customer_id}')" class="btn-small btn-info">👥 Profile</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        resultsBox.style.display = 'block';
    }

    static clear() {
        document.getElementById('globalSupportSearch').value = '';
        document.getElementById('supportSearchResults').style.display = 'none';
    }

    static openInPOS(customerId) {
        this.clear();
        showTab('pos');
        setTimeout(() => {
            if (window.POSUI) POSUI.selectCustomer(customerId);
        }, 300);
    }

    static viewDetails(customerId) {
        this.clear();
        showTab('customers');
        // Logic to select customer in customer list could go here
    }
}

// Close search on outside click
document.addEventListener('click', (e) => {
    const container = document.querySelector('.support-search-container');
    if (container && !container.contains(e.target)) {
        document.getElementById('supportSearchResults').style.display = 'none';
    }
});

window.SupportUI = SupportUI;
