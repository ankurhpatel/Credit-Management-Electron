// Dashboard UI management
class DashboardUI {
    static async loadStats() {
        try {
            console.log('📊 Loading dashboard stats...');
            const response = await fetch('/api/dashboard/stats');
            const stats = await response.json();

            // Store stats globally
            Store.setDashboardStats(stats);

            // Update UI elements
            this.updateStatsDisplay(stats);

            // Load expiring subscriptions
            await this.loadExpiringSubscriptions();

            console.log('✅ Dashboard stats loaded');
            return stats;
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
            Alerts.showError('Dashboard Error', 'Failed to load dashboard statistics');
            return {};
        }
    }

    static updateStatsDisplay(stats) {
        try {
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

            // Calculate derived metrics
            const avgProfitPerCredit = stats.totalCreditsUsed > 0
                ? stats.netProfitFromCreditSales / stats.totalCreditsUsed
                : 0;

            const avgRevenuePerCredit = stats.totalCreditsUsed > 0
                ? stats.totalRevenue / stats.totalCreditsUsed
                : 0;

            statMappings['avgProfitPerCredit'] = `$${avgProfitPerCredit.toFixed(2)}`;
            statMappings['avgRevenuePerCredit'] = `$${avgRevenuePerCredit.toFixed(2)}`;
            statMappings['avgCostPerCredit'] = `$${(stats.avgCostPerCredit || 0).toFixed(2)}`;

            // Update DOM elements
            Object.entries(statMappings).forEach(([elementId, value]) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = value;
                }
            });

            // Handle low credit alerts styling
            const alertCard = document.getElementById('lowCreditAlertsCard');
            if (alertCard) {
                if (stats.lowCreditAlerts > 0) {
                    alertCard.classList.add('alert');
                } else {
                    alertCard.classList.remove('alert');
                }
            }

            console.log('📊 Dashboard stats display updated');
        } catch (error) {
            console.error('❌ Error updating stats display:', error);
        }
    }

    static async loadExpiringSubscriptions() {
        try {
            // Load weekly and monthly expiring subscriptions
            const [weeklyExpiring, monthlyExpiring] = await Promise.all([
                SubscriptionsAPI.loadExpiring(7),
                SubscriptionsAPI.loadExpiring(30)
            ]);

            // Display weekly expiring
            this.displayExpiringSubscriptions(weeklyExpiring, 'weeklyExpiringList', 'week');

            // Display monthly expiring (excluding weekly ones)
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
            const message = period === 'week'
                ? 'No subscriptions expiring this week. Great job!'
                : 'No subscriptions expiring this month.';
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
                    <div class="expiring-customer">${customerName}</div>
                    <div class="expiring-details">
                        <strong>🔧 Service:</strong> ${sub.service_name || sub.ServiceName}<br>
                        <strong>📍 Location:</strong> ${sub.classification || sub.Classification || 'General'}<br>
                        <strong>⏰ Expires:</strong> ${expireDate.toLocaleDateString()} <em>(${daysUntilExpiry} days)</em><br>
                        <strong>💰 Amount:</strong> $${parseFloat(sub.amount_paid || sub.AmountPaid || 0).toFixed(2)}
                        ${(sub.notes || sub.Notes) ? `<br><strong>📝 Notes:</strong> <em>${sub.notes || sub.Notes}</em>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    static async refreshDashboard() {
        try {
            console.log('🔄 Refreshing dashboard...');
            await this.loadStats();
            Alerts.showInfo('Dashboard Refreshed', 'All data has been updated');
        } catch (error) {
            console.error('❌ Error refreshing dashboard:', error);
            Alerts.showError('Refresh Error', 'Failed to refresh dashboard data');
        }
    }
}

// Make available globally
window.DashboardUI = DashboardUI;
