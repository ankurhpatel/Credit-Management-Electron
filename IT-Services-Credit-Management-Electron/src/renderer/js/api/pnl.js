// P&L Reports API calls
class PLReportsAPI {
    static async loadMonthly(month, year) {
        try {
            console.log(`📊 Loading monthly P&L for ${month}/${year}...`);

            if (!month || !year) {
                throw new Error('Month and Year are required');
            }

            const response = await fetch(`/api/pl/monthly?month=${month}&year=${year}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load monthly P&L');
            }

            console.log('✅ Monthly P&L loaded successfully');
            return result;

        } catch (error) {
            console.error('❌ Error loading monthly P&L:', error);
            Alerts.showError('P&L Loading Error', error.message);
            throw error;
        }
    }

    static async loadYearly(year) {
        try {
            console.log(`📊 Loading yearly P&L for ${year}...`);

            if (!year) {
                throw new Error('Year is required');
            }

            const response = await fetch(`/api/pl/yearly?year=${year}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load yearly P&L');
            }

            console.log('✅ Yearly P&L loaded successfully');
            return result;

        } catch (error) {
            console.error('❌ Error loading yearly P&L:', error);
            Alerts.showError('P&L Loading Error', error.message);
            throw error;
        }
    }

    static populateYearDropdowns() {
        const selectYear = document.getElementById('selectYear');
        const selectYearOnly = document.getElementById('selectYearOnly');

        if (!selectYear && !selectYearOnly) return;

        const currentYear = new Date().getFullYear();

        [selectYear, selectYearOnly].forEach(select => {
            if (!select) return;

            select.innerHTML = '';

            // Add years from current year back to 10 years ago
            for (let y = currentYear; y >= currentYear - 10; y--) {
                const option = document.createElement('option');
                option.value = y;
                option.textContent = y;
                if (y === currentYear) option.selected = true;
                select.appendChild(option);
            }
        });

        // Set current month as default
        const currentMonth = new Date().getMonth() + 1;
        const monthSelect = document.getElementById('selectMonth');
        if (monthSelect) {
            monthSelect.value = currentMonth;
        }

        console.log('📅 Year dropdowns populated');
    }

    static getMonthName(monthNum) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[parseInt(monthNum) - 1] || 'Unknown';
    }

    static calculateProfitMargin(revenue, costs) {
        if (!revenue || revenue === 0) return 0;
        return ((revenue - costs) / revenue) * 100;
    }

    static formatPLPeriod(period) {
        if (period.includes('-')) {
            const [year, month] = period.split('-');
            return `${this.getMonthName(month)} ${year}`;
        }
        return period;
    }
}

// Make available globally
window.PLReportsAPI = PLReportsAPI;
