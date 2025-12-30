// Credit display and management UI
class CreditsUI {
    static async displayCreditBalances(balances) {
        const containers = [
            document.getElementById('creditBalancesList'),
            document.getElementById('creditBalancesView')
        ];

        // Load vendor services to get threshold settings
        let services = [];
        try {
            const res = await fetch('/api/vendor-services');
            services = await res.json();
        } catch (error) {
            console.error('Error loading services:', error);
        }

        containers.forEach(container => {
            if (!container) return;

            if (balances.length === 0) {
                container.innerHTML = '<div class="no-data">No credit balances found. Purchase credits to get started.</div>';
                return;
            }

            container.innerHTML = balances.map(balance => {
                const remainingCredits = balance.remaining_credits || balance.RemainingCredits || 0;

                // Find the service to get custom threshold
                const service = services.find(s =>
                    s.vendor_id === balance.vendor_id &&
                    s.service_name === (balance.service_name || balance.ServiceName)
                );
                const threshold = service?.low_stock_threshold !== undefined ? service.low_stock_threshold : 5;

                const alertClass = remainingCredits <= threshold ? 'low-credit' : '';
                const statusIcon = remainingCredits <= 0 ? '🔴' : (remainingCredits <= threshold ? '⚠️' : '✅');

                return `
                    <div class="credit-balance-item ${alertClass}">
                        <div class="balance-header">
                            <div>
                                <h4>${statusIcon} ${balance.vendor_name || balance.VendorName} - ${balance.service_name || balance.ServiceName}</h4>
                                <small style="color: #718096;">Alert threshold: ${threshold} units</small>
                            </div>
                            <div class="balance-header-actions">
                                ${remainingCredits <= threshold && remainingCredits > 0 ? '<div class="low-credit-badge">⚠️ Low Stock</div>' : ''}
                                ${remainingCredits <= 0 ? '<div class="out-of-stock-badge">🔴 Out of Stock</div>' : ''}
                                ${service ? `<button class="btn-icon" onclick="CreditsUI.showThresholdModal('${service.service_id}', '${(balance.service_name || balance.ServiceName).replace(/'/g, "\\'")}', ${remainingCredits}, ${threshold})" title="Configure alert threshold">⚙️</button>` : ''}
                            </div>
                        </div>
                        <div class="balance-details">
                            <strong>💳 Remaining Credits:</strong> ${Formatters.formatNumber(remainingCredits)}<br>
                            <strong>📊 Total Purchased:</strong> ${Formatters.formatNumber(balance.total_purchased || balance.TotalPurchased || 0)}<br>
                            <strong>📈 Total Used:</strong> ${Formatters.formatNumber(balance.total_used || balance.TotalUsed || 0)}<br>
                            <strong>📅 Last Updated:</strong> ${Formatters.formatDate(balance.last_updated || balance.LastUpdated)}
                        </div>
                        ${remainingCredits <= threshold && remainingCredits > 0 ?
                        `<div class="credit-warning">⚠️ <strong>Low Stock Alert:</strong> Stock is at or below your threshold of ${threshold} units. Consider purchasing more.</div>` : ''
                    }
                        ${remainingCredits <= 0 ?
                        '<div class="credit-warning" style="background: #fff5f5; border-color: #e53e3e; color: #c53030;">🔴 <strong>Out of Stock:</strong> No credits remaining. Purchase immediately!</div>' : ''
                    }
                    </div>
                `;
            }).join('');
        });
    }

    static async loadAndDisplayBalances() {
        try {
            const balances = await CreditsAPI.loadBalances();
            await this.displayCreditBalances(balances);
        } catch (error) {
            console.error('❌ Error loading credit balances:', error);
        }
    }

    static showThresholdModal(serviceId, serviceName, currentStock, currentThreshold) {
        const modal = document.getElementById('thresholdModal');
        if (!modal) {
            console.error('Threshold modal not found');
            return;
        }

        document.getElementById('thresholdServiceName').textContent = serviceName;
        document.getElementById('thresholdCurrentStock').textContent = currentStock;
        document.getElementById('thresholdInput').value = currentThreshold;
        document.getElementById('thresholdServiceId').value = serviceId;

        // Show preview
        this.updateThresholdPreview(currentStock, currentThreshold);

        modal.style.display = 'flex';
    }

    static updateThresholdPreview(stock, threshold) {
        const preview = document.getElementById('thresholdPreview');
        if (!preview) return;

        const status = stock <= 0 ? 'Out of Stock' : (stock <= threshold ? 'Low Stock Alert' : 'In Stock');
        const icon = stock <= 0 ? '🔴' : (stock <= threshold ? '⚠️' : '✅');
        const color = stock <= 0 ? '#e53e3e' : (stock <= threshold ? '#ed8936' : '#48bb78');

        preview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: ${color}22; border-left: 4px solid ${color}; border-radius: 6px;">
                <span style="font-size: 24px;">${icon}</span>
                <div>
                    <div style="font-weight: 700; color: ${color};">${status}</div>
                    <div style="font-size: 13px; color: #718096;">Current: ${stock} units | Alert below: ${threshold} units</div>
                </div>
            </div>
        `;
    }

    static closeThresholdModal() {
        const modal = document.getElementById('thresholdModal');
        if (modal) modal.style.display = 'none';
    }

    static async saveThreshold() {
        const serviceId = document.getElementById('thresholdServiceId').value;
        const threshold = parseInt(document.getElementById('thresholdInput').value) || 0;

        try {
            const res = await fetch(`/api/vendor-services/${serviceId}/threshold`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threshold })
            });

            if (!res.ok) throw new Error('Failed to update threshold');

            Alerts.showSuccess('Saved', `Low stock alert threshold updated to ${threshold} units`);
            this.closeThresholdModal();
            await this.loadAndDisplayBalances(); // Reload to show updated threshold
        } catch (error) {
            Alerts.showError('Error', 'Failed to save threshold: ' + error.message);
        }
    }
}

// Make available globally
window.CreditsUI = CreditsUI;
