    setupSubscriptionRoutes() {
        this.app.get('/api/subscriptions', (req, res) => {
            try {
                const subs = this.db.prepare('SELECT s.*, c.name as customer_name FROM subscriptions s JOIN customers c ON s.customer_id = c.id ORDER BY s.created_date DESC').all();
                res.json(subs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/subscriptions', (req, res) => {
            const transaction = this.db.transaction((data) => {
                const id = this.generateId();
                // Logic to update credits and insert sub
                this.db.prepare(`
                    INSERT INTO subscriptions (id, customer_id, service_name, start_date, expiration_date, amount_paid, credits_used, vendor_id, vendor_service_name, item_type, bundle_id, order_status, payment_type, payment_status, notes, classification, mac_address, status, discount_amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run([id, data.customerID, data.serviceName, data.startDate, data.expirationDate || '9999-12-31', data.amountPaid, data.creditsSelected, data.vendorID, data.vendorServiceName, data.itemType, data.bundleID, data.orderStatus, data.paymentType, data.paymentStatus, data.notes || '', data.classification || '', data.macAddress || '', data.status || 'active', data.discountAmount || 0]);
                
                if (data.vendorID && data.creditsSelected > 0) {
                    this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits - ?, total_used = total_used + ? WHERE vendor_id = ? AND service_name = ?')
                        .run([data.creditsSelected, data.creditsSelected, data.vendorID, data.vendorServiceName]);
                }
                return id;
            });
            try {
                const id = transaction(req.body);
                res.json({ success: true, id });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/subscriptions/:id', (req, res) => {
            try {
                const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get([req.params.id]);
                res.json(sub);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/subscriptions/:id/metadata', (req, res) => {
            try {
                const { orderStatus, paymentType, paymentStatus, transactionIdRef, notes } = req.body;
                this.db.prepare(`
                    UPDATE subscriptions 
                    SET order_status = ?, payment_type = ?, payment_status = ?, 
                        transaction_id_ref = ?, notes = ?
                    WHERE id = ?
                `).run([orderStatus, paymentType, paymentStatus, transactionIdRef, notes, req.params.id]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.delete('/api/subscriptions/:id', (req, res) => {
            try {
                const transaction = this.db.transaction(() => {
                    const sub = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get([req.params.id]);
                    if (sub && sub.vendor_id && sub.credits_used > 0) {
                        this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits + ?, total_used = total_used - ? WHERE vendor_id = ? AND service_name = ?')
                            .run([sub.credits_used, sub.credits_used, sub.vendor_id, sub.vendor_service_name]);
                    }
                    this.db.prepare('DELETE FROM subscriptions WHERE id = ?').run([req.params.id]);
                });
                transaction();
                res.json({ success: true, message: 'Deleted' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/bundles/:id', (req, res) => {
            try {
                const items = this.db.prepare('SELECT * FROM subscriptions WHERE bundle_id = ?').all([req.params.id]);
                res.json(items);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.put('/api/bundles/:id', (req, res) => {
            try {
                const { orderStatus, paymentType, paymentStatus, transactionIdRef, notes } = req.body;
                this.db.prepare(`
                    UPDATE subscriptions 
                    SET order_status = ?, payment_type = ?, payment_status = ?, 
                        transaction_id_ref = ?, notes = ?
                    WHERE bundle_id = ?
                `).run([orderStatus, paymentType, paymentStatus, transactionIdRef, notes, req.params.id]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.delete('/api/subscriptions/bundle/:bundleId', (req, res) => {
            try {
                const transaction = this.db.transaction(() => {
                    const items = this.db.prepare('SELECT * FROM subscriptions WHERE bundle_id = ?').all([req.params.bundleId]);
                    for (const item of items) {
                        if (item.vendor_id && item.credits_used > 0) {
                            this.db.prepare('UPDATE credit_balances SET remaining_credits = remaining_credits + ?, total_used = total_used - ? WHERE vendor_id = ? AND service_name = ?')
                                .run([item.credits_used, item.credits_used, item.vendor_id, item.vendor_service_name]);
                        }
                    }
                    this.db.prepare('DELETE FROM subscriptions WHERE bundle_id = ?').run([req.params.bundleId]);
                });
                transaction();
                res.json({ success: true, message: 'Bundle deleted' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }