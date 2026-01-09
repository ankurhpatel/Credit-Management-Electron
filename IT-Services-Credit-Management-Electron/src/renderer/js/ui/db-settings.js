class DBSettingsUI {
    static init() {
        console.log('🗄️ Initializing DB Settings UI...');
        this.loadTables();
    }

    static async loadTables() {
        const container = document.getElementById('dbTableList');
        if (!container) return;

        try {
            const res = await fetch('/api/database/tables');
            const tables = await res.json();

            container.innerHTML = tables.map(table => `
                <div class="db-table-item" onclick="DBSettingsUI.loadTableData('${table}')" 
                     style="padding: 10px; cursor: pointer; border-radius: 6px; margin-bottom: 5px; background: #f7fafc; transition: all 0.2s;">
                    📄 ${table}
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = `<div class="error-message">Failed to load tables: ${error.message}</div>`;
        }
    }

    static async loadTableData(tableName) {
        // Highlight selected
        document.querySelectorAll('.db-table-item').forEach(el => {
            el.style.background = '#f7fafc';
            el.style.fontWeight = 'normal';
            if (el.textContent.includes(tableName)) {
                el.style.background = '#e2e8f0';
                el.style.fontWeight = 'bold';
            }
        });

        document.getElementById('dbCurrentTableName').textContent = `📊 Table: ${tableName}`;
        document.getElementById('dbSqlInput').value = `SELECT * FROM ${tableName}`;

        try {
            const res = await fetch(`/api/database/table/${tableName}`);
            const data = await res.json();
            this.renderGrid(data);
        } catch (error) {
            document.getElementById('dbDataGrid').innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        }
    }

    static async executeQuery() {
        const sql = document.getElementById('dbSqlInput').value.trim();
        if (!sql) return;

        try {
            const res = await fetch('/api/database/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql })
            });
            const result = await res.json();

            if (result.error) throw new Error(result.error);

            if (result.type === 'SELECT') {
                this.renderGrid(result.data);
                document.getElementById('dbCurrentTableName').textContent = '📊 Query Result';
            } else {
                Alerts.showSuccess('Executed', `Query executed successfully. Rows affected: ${result.changes}`);
                // Refresh table list in case a table was created/dropped
                this.loadTables();
            }
        } catch (error) {
            Alerts.showError('SQL Error', error.message);
        }
    }

    static renderGrid(data) {
        const container = document.getElementById('dbDataGrid');
        const countLabel = document.getElementById('dbRowCount');
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-data">No data found or empty table.</div>';
            if (countLabel) countLabel.textContent = '0 rows';
            return;
        }

        if (countLabel) countLabel.textContent = `${data.length} rows`;

        const columns = Object.keys(data[0]);

        let html = '<table class="simple-table" style="width: 100%; border-collapse: collapse; font-size: 13px;"><thead><tr>';
        columns.forEach(col => {
            html += `<th style="text-align: left; padding: 8px; background: #edf2f7; border-bottom: 2px solid #cbd5e0; position: sticky; top: 0;">${col}</th>`;
        });
        html += '</tr></thead><tbody>';

        data.forEach(row => {
            html += '<tr style="border-bottom: 1px solid #e2e8f0;">';
            columns.forEach(col => {
                const val = row[col];
                const displayVal = val === null ? '<em style="color: #a0aec0;">null</em>' : 
                                   (typeof val === 'object' ? JSON.stringify(val) : val);
                html += `<td style="padding: 6px 8px; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${String(val)}">${displayVal}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        container.innerHTML = html;
    }
}

// Make available globally
window.DBSettingsUI = DBSettingsUI;

// Hook into the showSettingsTab function to lazy load tables
const originalShowSettingsTab = window.showSettingsTab || function(){};
window.showSettingsTab = function(tabId) {
    if (window.SettingsUI) {
        SettingsUI.showTab(tabId);
    } else {
        // Fallback if SettingsUI isn't ready
        document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
        const target = document.getElementById(tabId);
        if (target) target.style.display = 'block';
    }

    if (tabId === 'db-settings') {
        DBSettingsUI.init();
    }
};
