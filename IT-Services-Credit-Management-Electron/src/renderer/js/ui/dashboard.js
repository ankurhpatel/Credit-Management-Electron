// Dashboard UI management with Charts
class DashboardUI {
    static profitChart = null;

    static async loadStats() {
        try {
            console.log('📊 Loading dashboard stats...');
            const response = await fetch('/api/dashboard/stats');
            const stats = await response.json();

            // Store stats globally
            Store.setDashboardStats(stats);

            // 1. Update Today's Pulse
            if (stats.today) {
                document.getElementById('todayCash').textContent = `$${parseFloat(stats.today.cash || 0).toFixed(2)}`;
                document.getElementById('todayProfit').textContent = `$${parseFloat(stats.today.profit || 0).toFixed(2)}`;
                document.getElementById('todaySalesCount').textContent = stats.today.salesCount || 0;
            }

            // 2. Update Lifetime Overview
            this.updateStatsDisplay(stats);

            // 3. Load Chart
            await this.loadChartData('monthly');

            // 4. Load expiring subscriptions
            await this.loadExpiringSubscriptions();

            console.log('✅ Dashboard stats and chart loaded');
            return stats;
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
            Alerts.showError('Dashboard Error', 'Failed to load dashboard statistics');
            return {};
        }
    }

    static updateStatsDisplay(stats) {
        try {
            // Update Income Breakdown
            if (stats.revenueBreakdown) {
                document.getElementById('revenueCredits').textContent = `$${parseFloat(stats.revenueBreakdown.credits || 0).toFixed(2)}`;
                document.getElementById('revenueHardware').textContent = `$${parseFloat(stats.revenueBreakdown.hardware || 0).toFixed(2)}`;
                document.getElementById('revenueFees').textContent = `$${parseFloat(stats.revenueBreakdown.fees || 0).toFixed(2)}`;
            }

            // Update stat cards
            const statMappings = {
                'totalCustomers': stats.totalCustomers || 0,
                'totalCreditsUsed': stats.totalCreditsUsed || 0,
                'netProfitFromCreditSales': `$${(stats.netProfitFromCreditSales || 0).toFixed(2)}`,
                'totalRevenue': `$${(stats.totalRevenue || 0).toFixed(2)}`,
                'totalVendorCosts': `$${(stats.totalVendorCosts || 0).toFixed(2)}`,
                'finalNetProfit': `$${(stats.finalNetProfit || 0).toFixed(2)}`,
                'totalCreditsRemaining': stats.totalCreditsRemaining || 0,
                'lowCreditAlerts': stats.lowCreditAlerts || 0
            };

            // Update DOM elements
            Object.entries(statMappings).forEach(([elementId, value]) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = value;
                }
            });

            // Handle low stock alerts styling
            const alertCard = document.getElementById('lowCreditAlertsCard');
            if (alertCard) {
                if (stats.lowCreditAlerts > 0) {
                    alertCard.classList.add('alert');
                } else {
                    alertCard.classList.remove('alert');
                }
            }
        } catch (error) {
            console.error('❌ Error updating stats display:', error);
        }
    }

    // Chart Logic
    static async loadChartData(period) {
        try {
            const response = await fetch(`/api/dashboard/profit-data?period=${period}`);
            const data = await response.json();
            this.renderProfitChart(data, period);
        } catch (error) {
            console.error('Error loading chart:', error);
        }
    }

    static renderProfitChart(data, period) {
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
                        label: 'Est. Net Profit ($)',
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

    static changeChartPeriod(period) {
        // Toggle active button UI
        document.getElementById('btnMonthlyChart').classList.toggle('active', period === 'monthly');
        document.getElementById('btnYearlyChart').classList.toggle('active', period === 'yearly');
        
        this.loadChartData(period);
    }

    // Expiring Subscriptions (Keeping existing logic)
    static async loadExpiringSubscriptions() {
        try {
            const [weeklyExpiring, monthlyExpiring] = await Promise.all([
                SubscriptionsAPI.loadExpiring(7),
                SubscriptionsAPI.loadExpiring(30)
            ]);

            this.displayExpiringSubscriptions(weeklyExpiring, 'weeklyExpiringList', 'week');

            const monthlyOnly = monthlyExpiring.filter(monthly =>
                !weeklyExpiring.some(weekly =>
                    (weekly.id || weekly.SubscriptionID) === (monthly.id || monthly.SubscriptionID)
                )
            );
            this.displayExpiringSubscriptions(monthlyOnly, 'monthlyExpiringList', 'month');
        } catch (error) {
            console.error('❌ Error loading expiring subscriptions:', error);
        }
    }

    static displayExpiringSubscriptions(subscriptions, containerId, period) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (subscriptions.length === 0) {
            const message = period === 'week' ? 'No subscriptions expiring this week.' : 'No subscriptions expiring this month.';
            container.innerHTML = `<div class="no-data">${message}</div>`;
            return;
        }

        container.innerHTML = subscriptions.map(sub => {
            const expireDate = new Date(sub.expiration_date || sub.ExpirationDate);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24));
            const alertClass = daysUntilExpiry <= 7 ? 'critical' : 'warning';
            const customerName = sub.customer_name || sub.CustomerName || 'Unknown Customer';

            return `
                <div class="expiring-item ${alertClass}">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div class="expiring-customer">${customerName}</div>
                        <div class="expiring-actions" style="display: flex; gap: 5px;">
                            <button onclick="DashboardUI.sendWhatsApp('${sub.customer_phone}', '${customerName}', '${sub.service_name}')" 
                                    class="btn-icon" title="Send WhatsApp">🟢</button>
                            <button onclick="DashboardUI.sendEmail('${sub.customer_email}', '${customerName}', '${sub.service_name}', '${expireDate.toLocaleDateString()}')" 
                                    class="btn-icon" title="Send Email">📧</button>
                        </div>
                    </div>
                    <div class="expiring-details">
                        <strong>🔧 Service:</strong> ${sub.service_name || sub.ServiceName}<br>
                        📅 Expires: ${expireDate.toLocaleDateString()} <em>(${daysUntilExpiry} days)</em>
                    </div>
                </div>
            `;
        }).join('');
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

    static async refreshDashboard() {
        await this.loadStats();
        Alerts.showInfo('Dashboard Refreshed', 'All data updated');
    }
}

window.DashboardUI = DashboardUI;