// Dashboard UI management with Charts
class DashboardUI {
    static profitChart = null;
    static mixChart = null;

    static async init() {
        this.populateYears();
        await this.loadStats();
    }

    static populateYears() {
        const yearSelect = document.getElementById('dashboardFilterYear');
        if (!yearSelect) return;
        
        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '<option value="all">All Years</option>';
        for (let y = currentYear; y >= 2020; y--) {
            yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
        }
    }

    static async refreshStats() {
        await this.loadStats();
    }

    static async loadStats() {
        try {
            console.log('📊 Loading dashboard stats...');
            
            const month = document.getElementById('dashboardFilterMonth')?.value || 'all';
            const year = document.getElementById('dashboardFilterYear')?.value || 'all';
            
            let url = '/api/dashboard/stats';
            const params = new URLSearchParams();
            if (month !== 'all') params.append('month', month);
            if (year !== 'all') params.append('year', year);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url);
            const stats = await response.json();

            if (stats.error) throw new Error(stats.error);

            // Store stats globally
            Store.setDashboardStats(stats);

            // 1. Update KPIs (Tier 1)
            this.updateKPIs(stats.kpis);

            // 2. Render Revenue Mix Chart (Tier 2)
            if (stats.revenueMix) this.renderMixChart(stats.revenueMix);

            // 3. Render Top Items List (Tier 3)
            if (stats.topItems) this.renderTopItems(stats.topItems);

            // 4. Render Low Stock Actions (Tier 3)
            if (stats.actionItems) this.renderLowStock(stats.actionItems.lowStockList);

            // 5. Load Profit Chart (Tier 2 - filtered)
            await this.loadChartData(month, year);

            // 6. Load Expiring Subscriptions (Tier 3 - Action Items)
            await this.loadExpiringSubscriptions();

            console.log('✅ Dashboard stats loaded');
            return stats;
        } catch (error) {
            console.error('❌ Dashboard Error:', error);
            Alerts.showError('Dashboard Error', 'Failed to load dashboard statistics: ' + error.message);
            return {};
        }
    }

    static updateKPIs(kpis) {
        if (!kpis) return;
        const elRev = document.getElementById('kpiRevenue');
        const elGP = document.getElementById('kpiGrossProfit');
        const elMarg = document.getElementById('kpiMargin');
        const elOrd = document.getElementById('kpiOrders');

        if (elRev) elRev.textContent = `$${parseFloat(kpis.revenue || 0).toFixed(2)}`;
        if (elGP) elGP.textContent = `$${parseFloat(kpis.grossProfit || 0).toFixed(2)}`;
        if (elMarg) elMarg.textContent = `${parseFloat(kpis.margin || 0).toFixed(1)}%`;
        if (elOrd) elOrd.textContent = kpis.orders || 0;
    }

    static renderTopItems(items) {
        const container = document.getElementById('topItemsList');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #a0aec0; font-style: italic;">No sales data for this period.</td></tr>';
            return;
        }

        container.innerHTML = items.map(item => `
            <tr style="border-bottom: 1px solid #f7fafc;">
                <td style="padding: 12px 8px; color: #2d3748; font-weight: 500;">
                    ${item.service_name} <br>
                    <span style="font-size: 11px; color: #718096; font-weight: normal;">${item.type}</span>
                </td>
                <td style="padding: 12px 8px; text-align: right; color: #4a5568;">${item.units_sold}</td>
                <td style="padding: 12px 8px; text-align: right; color: #38a169; font-weight: 600;">$${parseFloat(item.profit).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    static renderLowStock(items) {
        const container = document.getElementById('lowStockList');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '<div style="font-size: 13px; color: #38a169; padding: 10px; background: #f0fff4; border-radius: 6px;">✅ Stock levels are healthy.</div>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #edf2f7;">
                <span style="font-size: 13px; color: #4a5568;">${item.service_name}</span>
                <span style="font-size: 12px; font-weight: 700; color: #e53e3e; background: #fff5f5; padding: 2px 8px; border-radius: 10px;">${item.remaining_credits} left</span>
            </div>
        `).join('');
    }

    // Chart Logic
    static async loadChartData(month, year) {
        try {
            let url = '/api/dashboard/profit-data';
            const params = new URLSearchParams();
            if (month !== 'all') params.append('month', month);
            if (year !== 'all') params.append('year', year);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url);
            const data = await response.json();
            this.renderProfitChart(data);
        } catch (error) {
            console.error('Error loading chart:', error);
        }
    }

    static renderProfitChart(data) {
        const ctx = document.getElementById('profitChart').getContext('2d');
        
        if (this.profitChart) {
            this.profitChart.destroy();
        }

        this.profitChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Gross Revenue ($)',
                        data: data.revenue,
                        backgroundColor: 'rgba(102, 126, 234, 0.6)',
                        borderColor: '#667eea',
                        borderWidth: 1
                    },
                    {
                        label: 'Gross Profit ($)',
                        data: data.profit,
                        backgroundColor: 'rgba(72, 187, 120, 0.6)',
                        borderColor: '#48bb78',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return '$' + value; }
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) { 
                                return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    static renderMixChart(data) {
        const ctx = document.getElementById('mixChart').getContext('2d');
        
        if (this.mixChart) {
            this.mixChart.destroy();
        }

        if (!data || data.length === 0) {
            // Handle empty data
        }

        const labels = data.map(d => {
            const type = d.type || 'Other';
            return type.charAt(0).toUpperCase() + type.slice(1);
        });
        const values = data.map(d => d.total);
        const colors = ['#667eea', '#48bb78', '#ed8936', '#4299e1'];

        this.mixChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            label: function(context) { 
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                return context.label + ': $' + value.toFixed(2) + ' (' + percentage + ')';
                            }
                        }
                    }
                }
            }
        });
    }

    // Expiring Subscriptions (Consolidated List)
    static async loadExpiringSubscriptions() {
        try {
            // Load next 30 days
            const expiring = await SubscriptionsAPI.loadExpiring(30);
            this.displayExpiringSubscriptions(expiring);
        } catch (error) {
            console.error('❌ Error loading expiring subscriptions:', error);
        }
    }

    static displayExpiringSubscriptions(subscriptions) {
        const container = document.getElementById('expiringList');
        if (!container) return;

        if (subscriptions.length === 0) {
            container.innerHTML = '<div style="font-size: 13px; color: #38a169; padding: 10px; background: #f0fff4; border-radius: 6px;">✅ No upcoming expirations.</div>';
            return;
        }

        // Show top 5 only
        const top5 = subscriptions.slice(0, 5);

        container.innerHTML = top5.map(sub => {
            const expireDate = new Date(sub.expiration_date || sub.ExpirationDate);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
            const isCritical = daysUntilExpiry <= 7;
            const color = isCritical ? '#e53e3e' : '#ed8936';
            const customerName = sub.customer_name || sub.CustomerName || 'Unknown';

            return `
                <div style="padding: 8px 0; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 13px; color: #2d3748; font-weight: 500;">${customerName}</div>
                        <div style="font-size: 11px; color: #718096;">${sub.service_name || sub.ServiceName}</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 12px; font-weight: 700; color: ${color};">${daysUntilExpiry} days</span>
                        <div style="display: flex; gap: 5px; justify-content: flex-end; margin-top: 2px;">
                            <button onclick="DashboardUI.sendWhatsApp('${sub.customer_phone}', '${customerName}', '${sub.service_name}')" 
                                    style="border: none; background: none; cursor: pointer; padding: 0; font-size: 14px;" title="WhatsApp">🟢</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        if (subscriptions.length > 5) {
            container.innerHTML += `<div style="text-align: center; padding-top: 5px; font-size: 12px; color: #667eea;">+${subscriptions.length - 5} more</div>`;
        }
    }

    static sendWhatsApp(phone, name, service) {
        if (!phone || phone === 'Not provided') { Alerts.showError('Missing Info', 'No phone number found.'); return; }
        const message = `Hi ${name}, your ${service} subscription is expiring soon. Would you like to renew it?`;
        const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    static sendEmail(email, name, service, date) {
        if (!email || email === 'Not provided') { Alerts.showError('Missing Info', 'No email address found.'); return; }
        const subject = encodeURIComponent(`Renewal Reminder: ${service}`);
        const body = encodeURIComponent(`Hi ${name},

Friendly reminder that your ${service} subscription expires on ${date}.

Best regards,
IT Services Team`);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }
}

window.DashboardUI = DashboardUI;