// Customer Profile UI - Comprehensive customer analytics and history
class CustomerProfileUI {
    static currentProfile = null;
    static currentFilter = 'all'; // all, 2025, 2024, etc.

    static async loadProfile(customerId) {
        try {
            console.log(`📊 Loading profile for customer ${customerId}...`);

            const res = await fetch(`/api/customers/${customerId}/profile`);
            console.log('Response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Server error:', errorText);
                throw new Error(`Server returned ${res.status}: ${errorText}`);
            }

            const profile = await res.json();
            console.log('Profile data received:', profile);
            this.currentProfile = profile;

            // Show the profile tab
            document.getElementById('customerProfileTab').style.display = 'block';
            showCustomerTab('customer-profile');

            // Render the profile
            this.renderProfile(profile);

            console.log('✅ Customer profile loaded');
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            Alerts.showError('Error', 'Failed to load customer profile: ' + error.message);
        }
    }

    static renderProfile(profile) {
        const container = document.getElementById('customerProfileContent');
        if (!container) return;

        const { customer, stats, receipts, activeSubscriptions, yearlyStats } = profile;

        // Calculate customer tenure
        const tenure = this.calculateTenure(customer.created_date);

        // Determine segment badge
        const segmentBadge = this.getSegmentBadge(stats.segment);

        // Build the profile HTML
        container.innerHTML = `
            <!-- Back Button -->
            <div style="margin-bottom: 20px;">
                <button onclick="showCustomerTab('customer-list')" class="btn-secondary">← Back to Customer List</button>
            </div>

            <!-- Profile Header -->
            <div class="profile-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h2 style="margin: 0 0 10px 0; font-size: 28px;">${customer.name}</h2>
                        <div style="font-size: 14px; opacity: 0.9;">
                            📧 ${customer.email} ${customer.phone ? `| 📱 ${customer.phone}` : ''}
                        </div>
                        <div style="font-size: 13px; opacity: 0.8; margin-top: 5px;">
                            Customer since ${this.formatDate(customer.created_date)} (${tenure})
                        </div>
                    </div>
                    <div style="text-align: right;">
                        ${segmentBadge}
                        <div style="margin-top: 10px;">
                            <button onclick="editCustomerById('${customer.id}')" class="btn-small" style="background: white; color: #667eea;">✏️ Edit</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #48bb78;">
                    <div style="font-size: 12px; color: #718096; margin-bottom: 5px;">💰 Lifetime Value</div>
                    <div style="font-size: 24px; font-weight: 700; color: #2d3748;">$${stats.lifetimeValue.toFixed(2)}</div>
                </div>
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="font-size: 12px; color: #718096; margin-bottom: 5px;">📦 Total Orders</div>
                    <div style="font-size: 24px; font-weight: 700; color: #2d3748;">${stats.totalOrders}</div>
                </div>
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ed8936;">
                    <div style="font-size: 12px; color: #718096; margin-bottom: 5px;">📅 Last Purchase</div>
                    <div style="font-size: 24px; font-weight: 700; color: #2d3748;">${stats.daysSinceLastPurchase !== null ? stats.daysSinceLastPurchase : 'N/A'}</div>
                    <div style="font-size: 11px; color: #718096;">days ago</div>
                </div>
                <div class="stat-card" style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #9f7aea;">
                    <div style="font-size: 12px; color: #718096; margin-bottom: 5px;">🔄 Avg. Renewal</div>
                    <div style="font-size: 24px; font-weight: 700; color: #2d3748;">${stats.renewalFrequency || 'N/A'}</div>
                    ${stats.renewalFrequency ? '<div style="font-size: 11px; color: #718096;">days</div>' : ''}
                </div>
            </div>

            <!-- Main Content Grid -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                <!-- Left Column: Receipts & Timeline -->
                <div>
                    ${this.renderInsightsPanel(stats, customer)}
                    ${this.renderReceiptsSection(receipts)}
                </div>

                <!-- Right Column: Active Subscriptions & Stats -->
                <div>
                    ${this.renderActiveSubscriptions(activeSubscriptions)}
                    ${this.renderYearlyTimeline(yearlyStats, stats.lifetimeValue)}
                    ${this.renderInternalNotes(customer)}
                </div>
            </div>
        `;
    }

    static renderInsightsPanel(stats, customer) {
        const insights = [];

        // Renewal prediction
        if (stats.renewalFrequency && stats.daysSinceLastPurchase !== null) {
            const expectedRenewal = stats.renewalFrequency;
            const daysSince = stats.daysSinceLastPurchase;

            if (daysSince < expectedRenewal - 7) {
                insights.push({ icon: '✅', text: 'On track - renewal pattern is normal', type: 'success' });
            } else if (daysSince >= expectedRenewal - 7 && daysSince <= expectedRenewal + 7) {
                insights.push({ icon: '⏰', text: `Due for renewal soon (typically renews every ${expectedRenewal} days)`, type: 'warning' });
            } else {
                insights.push({ icon: '⚠️', text: `Overdue for renewal by ${daysSince - expectedRenewal} days`, type: 'danger' });
            }
        }

        // Spending pattern
        if (stats.totalOrders >= 3) {
            const avgOrder = stats.avgOrderValue;
            if (avgOrder > 100) {
                insights.push({ icon: '💎', text: `High-value customer - avg. order: $${avgOrder.toFixed(2)}`, type: 'success' });
            } else {
                insights.push({ icon: '📊', text: `Average order value: $${avgOrder.toFixed(2)}`, type: 'info' });
            }
        }

        // Segment insights
        if (stats.segment === 'vip') {
            insights.push({ icon: '⭐', text: 'VIP Customer - Top tier lifetime value', type: 'success' });
        } else if (stats.segment === 'at-risk') {
            insights.push({ icon: '🚨', text: 'At-Risk - No purchase in 90+ days', type: 'danger' });
        } else if (stats.segment === 'regular') {
            insights.push({ icon: '👍', text: 'Regular customer - consistent purchases', type: 'success' });
        }

        if (insights.length === 0) return '';

        return `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 15px 0; font-size: 16px;">💡 Customer Insights</h4>
                ${insights.map(insight => {
                    const colors = {
                        success: { bg: '#f0fff4', border: '#48bb78', text: '#2f855a' },
                        warning: { bg: '#fffaf0', border: '#ed8936', text: '#c05621' },
                        danger: { bg: '#fff5f5', border: '#e53e3e', text: '#c53030' },
                        info: { bg: '#ebf8ff', border: '#4299e1', text: '#2c5282' }
                    };
                    const color = colors[insight.type];
                    return `
                        <div style="padding: 12px; margin-bottom: 8px; background: ${color.bg}; border-left: 4px solid ${color.border}; border-radius: 6px;">
                            <span style="font-size: 18px; margin-right: 8px;">${insight.icon}</span>
                            <span style="color: ${color.text}; font-weight: 500;">${insight.text}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static renderReceiptsSection(receipts) {
        // Get unique years
        const uniqueYears = [...new Set(receipts.map(r => {
            const date = new Date(r.date);
            return date.getFullYear();
        }))];
        const years = ['all', ...uniqueYears.sort((a, b) => b - a)];

        return `
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="margin: 0; font-size: 16px;">📜 Purchase History (${receipts.length} receipts)</h4>
                    <div class="year-filter-buttons">
                        ${years.map(year => `
                            <button onclick="CustomerProfileUI.filterReceipts('${year}')"
                                    class="filter-btn ${this.currentFilter === year.toString() ? 'active' : ''}"
                                    style="padding: 4px 12px; margin-left: 5px; border: 1px solid #e2e8f0; background: ${this.currentFilter === year.toString() ? '#667eea' : 'white'}; color: ${this.currentFilter === year.toString() ? 'white' : '#4a5568'}; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                ${year === 'all' ? 'All' : year}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div id="receiptsList">
                    ${this.renderFilteredReceipts(receipts, this.currentFilter)}
                </div>
            </div>
        `;
    }

    static renderFilteredReceipts(receipts, filter) {
        const filtered = filter === 'all'
            ? receipts
            : receipts.filter(r => new Date(r.date).getFullYear().toString() === filter);

        if (filtered.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #718096;">No receipts found for this period</div>';
        }

        return filtered.map(receipt => {
            const statusColors = {
                'Paid': { bg: '#f0fff4', text: '#2f855a' },
                'Pending': { bg: '#fffaf0', text: '#c05621' },
                'Advance': { bg: '#ebf8ff', text: '#2c5282' }
            };
            const statusColor = statusColors[receipt.paymentStatus] || statusColors['Pending'];

            // Determine if this is a bundle (has bundle_id) or legacy single item
            const firstItem = receipt.items[0];
            const hasBundleId = !!firstItem.bundle_id;
            
            // If it has a bundle_id, use printBundleReceipt. 
            // If not (legacy), use printSingleTransaction with the first item's ID.
            // Note: receipt.bundleId from backend is either bundle_id or the item id if bundle_id is missing.
            const printAction = hasBundleId 
                ? `PrintManager.printBundleReceipt('${receipt.bundleId}')`
                : `PrintManager.printSingleTransaction('${this.currentProfile.customer.id}', '${firstItem.id}')`;

            return `
                <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div>
                            <div style="font-weight: 600; font-size: 14px; color: #2d3748;">
                                Receipt #${receipt.bundleId.substring(receipt.bundleId.length - 6)}
                            </div>
                            <div style="font-size: 12px; color: #718096; margin-top: 3px;">
                                ${this.formatDate(receipt.date)} • ${receipt.paymentType}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: 700; color: #2d3748;">$${receipt.total.toFixed(2)}</div>
                            <div style="display: inline-block; padding: 2px 8px; background: ${statusColor.bg}; color: ${statusColor.text}; font-size: 11px; font-weight: 600; border-radius: 10px; margin-top: 3px;">
                                ${receipt.paymentStatus}
                            </div>
                        </div>
                    </div>
                    <div style="font-size: 13px; color: #4a5568; margin-bottom: 10px;">
                        ${receipt.items.map(item => `• ${item.vendor_service_name || item.service_name}`).join('<br>')}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="${printAction}" class="btn-small btn-secondary" style="font-size: 11px; padding: 4px 10px;">🖨️ Print</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    static renderActiveSubscriptions(subs) {
        if (!subs || subs.length === 0) {
            return `
                <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 15px 0; font-size: 16px;">🔄 Active Subscriptions</h4>
                    <div style="text-align: center; padding: 20px; color: #718096;">No active subscriptions</div>
                </div>
            `;
        }

        return `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 15px 0; font-size: 16px;">🔄 Active Subscriptions (${subs.length})</h4>
                ${subs.map(sub => `
                    <div style="padding: 12px; background: #f7fafc; border-radius: 6px; margin-bottom: 10px;">
                        <div style="font-weight: 600; font-size: 13px; color: #2d3748; margin-bottom: 4px;">
                            ${sub.vendor_service_name || sub.service_name}
                        </div>
                        <div style="font-size: 11px; color: #718096;">
                            Started: ${this.formatDate(sub.start_date)}<br>
                            Renewed: ${sub.renewal_count - 1} time${sub.renewal_count - 1 !== 1 ? 's' : ''}<br>
                            ${sub.classification ? `Location: ${sub.classification}` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    static renderYearlyTimeline(yearlyStats, totalValue) {
        if (!yearlyStats || yearlyStats.length === 0) return '';

        const maxRevenue = Math.max(...yearlyStats.map(y => parseFloat(y.revenue || 0)));

        return `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 15px 0; font-size: 16px;">📈 Yearly Breakdown</h4>
                ${yearlyStats.map(year => {
                    const revenue = parseFloat(year.revenue || 0);
                    const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                    return `
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                                <span style="font-weight: 600;">${year.year}</span>
                                <span style="color: #718096;">${year.orders} orders • $${revenue.toFixed(2)}</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    static renderInternalNotes(customer) {
        const notes = customer.internal_notes || '';

        return `
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 15px 0; font-size: 16px;">📝 Internal Notes</h4>
                <div style="font-size: 13px; color: #4a5568; line-height: 1.6; white-space: pre-wrap;">
                    ${notes || '<em style="color: #a0aec0;">No notes yet. Add notes in Edit Customer.</em>'}
                </div>
            </div>
        `;
    }

    static filterReceipts(year) {
        this.currentFilter = year;
        if (this.currentProfile) {
            this.renderProfile(this.currentProfile);
        }
    }

    static calculateTenure(createdDate) {
        if (!createdDate) return 'N/A';

        const created = new Date(createdDate);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) return `${diffDays} days`;
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months !== 1 ? 's' : ''}`;
        }

        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} month${months !== 1 ? 's' : ''}` : ''}`;
    }

    static getSegmentBadge(segment) {
        const badges = {
            vip: { label: '⭐ VIP Customer', color: '#ffd700', bg: '#fffbeb' },
            regular: { label: '👍 Regular Customer', color: '#48bb78', bg: '#f0fff4' },
            'at-risk': { label: '⚠️ At Risk', color: '#e53e3e', bg: '#fff5f5' },
            new: { label: '🆕 New Customer', color: '#4299e1', bg: '#ebf8ff' }
        };

        const badge = badges[segment] || badges['new'];
        return `
            <div style="display: inline-block; padding: 8px 16px; background: ${badge.bg}; color: ${badge.color}; font-weight: 700; border-radius: 20px; font-size: 13px; border: 2px solid ${badge.color};">
                ${badge.label}
            </div>
        `;
    }

    static formatDate(date) {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    }
}

// Make available globally
window.CustomerProfileUI = CustomerProfileUI;
