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

            container.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
                    ${balances.map(balance => {
                        const remainingCredits = balance.remaining_credits || balance.RemainingCredits || 0;

                        // Find the service to get custom threshold
                        const service = services.find(s =>
                            s.vendor_id === balance.vendor_id &&
                            s.service_name === (balance.service_name || balance.ServiceName)
                        );
                        const threshold = service?.low_stock_threshold !== undefined ? service.low_stock_threshold : 5;

                        const isOutOfStock = remainingCredits <= 0;
                        const isLowStock = remainingCredits <= threshold && !isOutOfStock;
                        
                        const statusColor = isOutOfStock ? '#e53e3e' : (isLowStock ? '#ed8936' : '#48bb78');
                        const statusBg = isOutOfStock ? '#fff5f5' : (isLowStock ? '#fffaf0' : '#f0fff4');

                        return `
                            <div class="inventory-card" style="background: white; border-radius: 16px; border: 1px solid #edf2f7; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column;">
                                <!-- Header Color Strip -->
                                <div style="height: 6px; background: ${statusColor};"></div>
                                
                                <div style="padding: 20px; flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                        <div>
                                            <h4 style="margin: 0; font-size: 16px; color: #2d3748; font-weight: 700;">${balance.service_name || balance.ServiceName}</h4>
                                            <small style="color: #718096; font-weight: 600;">${balance.vendor_name || balance.VendorName}</small>
                                        </div>
                                        ${service ? `<button class="btn-icon" onclick="CreditsUI.showThresholdModal('${service.service_id}', ${remainingCredits})" style="background: #f7fafc; border-radius: 8px; padding: 6px;" title="Settings">⚙️</button>` : ''}
                                    </div>

                                    <div style="background: ${statusBg}; padding: 15px; border-radius: 12px; margin-bottom: 15px; text-align: center;">
                                        <div style="font-size: 11px; color: ${statusColor}; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 5px;">
                                            ${isOutOfStock ? '🚫 Out of Stock' : (isLowStock ? '⚠️ Low Stock' : '✅ In Stock')}
                                        </div>
                                        <div style="font-size: 32px; font-weight: 800; color: #2d3748;">${remainingCredits}</div>
                                        <div style="font-size: 12px; color: #718096;">available units</div>
                                    </div>

                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; color: #4a5568;">
                                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
                                            <div style="color: #a0aec0; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">Purchased</div>
                                            <strong>${balance.total_purchased || 0}</strong>
                                        </div>
                                        <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
                                            <div style="color: #a0aec0; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">Used</div>
                                            <strong>${balance.total_used || 0}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div style="padding: 12px 20px; background: #fcfcfc; border-top: 1px solid #f7fafc; font-size: 11px; color: #a0aec0; display: flex; justify-content: space-between; align-items: center;">
                                    <span>Refreshed: ${Formatters.formatDate(balance.last_updated)}</span>
                                    <span style="background: white; padding: 2px 6px; border: 1px solid #edf2f7; border-radius: 4px;">Limit: ${threshold}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
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

    static showThresholdModal(serviceId, currentStock) {
        console.log('⚙️ Opening Threshold Modal:', { serviceId, currentStock });
        
        // Look up service details from Store
        const services = Store.getVendorServices();
        const service = services.find(s => s.service_id === serviceId);
        
        if (!service) {
            console.error('Service not found:', serviceId);
            return;
        }

        const serviceName = service.service_name;
        const currentThreshold = service.low_stock_threshold !== undefined ? service.low_stock_threshold : 5;

        const modal = document.getElementById('thresholdModal');
        if (!modal) {
            console.error('Threshold modal not found in DOM');
            return;
        }

        const nameEl = document.getElementById('thresholdServiceName');
        if (nameEl) nameEl.textContent = serviceName;
        
        const stockEl = document.getElementById('thresholdCurrentStock');
        if (stockEl) stockEl.textContent = currentStock;
        
        const inputEl = document.getElementById('thresholdInput');
        if (inputEl) inputEl.value = currentThreshold;
        
        const idEl = document.getElementById('thresholdServiceId');
        if (idEl) idEl.value = serviceId;

        // Show preview
        this.updateThresholdPreview(currentStock, currentThreshold);

        modal.style.setProperty('display', 'flex', 'important');
        console.log('✅ Modal display set to flex');
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
