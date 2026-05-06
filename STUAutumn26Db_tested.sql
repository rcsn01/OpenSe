----------------
--CREATE TABLES
----------------
CREATE TABLE dim_company (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_location_type (
    location_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id)
);

CREATE TABLE dim_location (
    location_id SERIAL PRIMARY KEY,
    parent_location_id INT NULL REFERENCES dim_location(location_id),
    location_type_id INT NOT NULL REFERENCES dim_location_type(location_type_id),
    location_name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) NULL,
    company_id INTEGER NOT NULL REFERENCES dim_company(company_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT location_self_ref_check CHECK (location_id != parent_location_id)
);

CREATE INDEX idx_location_parent ON dim_location(parent_location_id);
CREATE INDEX idx_location_company ON dim_location(company_id);

CREATE TABLE dim_category (
    category_id SERIAL PRIMARY KEY,
    parent_category_id INT NULL REFERENCES dim_category(category_id),
    category_name VARCHAR(255) NOT NULL,
    company_id INTEGER NOT NULL REFERENCES dim_company(company_id)
);

CREATE TABLE dim_supplier (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    company_id INT NOT NULL REFERENCES dim_company(company_id)
);

CREATE TABLE dim_product (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NULL,
    category_id INT NOT NULL REFERENCES dim_category(category_id),
    supplier_id INT NOT NULL REFERENCES dim_supplier(supplier_id),
    company_id INT NOT NULL REFERENCES dim_company(company_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, sku)
);

CREATE TABLE dim_permission (
    permission_id SERIAL PRIMARY KEY,
    resource_type VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NULL,

    UNIQUE(resource_type, action)
);

CREATE TABLE dim_role (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL,
    company_id INT NULL REFERENCES dim_company(company_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(company_id, role_name)
);

CREATE TABLE bridge_role_permission (
    role_id INT NOT NULL REFERENCES dim_role(role_id),
    permission_id INT NOT NULL REFERENCES dim_permission(permission_id),
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE dim_user (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bridge_user_role (
    user_id INT NOT NULL REFERENCES dim_user(user_id),
    role_id INT NOT NULL REFERENCES dim_role(role_id),
    company_id INT NOT NULL REFERENCES dim_company(company_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, role_id, company_id)
);

CREATE TABLE dim_transaction_type (
    transaction_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id)
);

CREATE TABLE fact_inventory_transactions (
    transaction_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES dim_product(product_id),
    location_id INT NOT NULL REFERENCES dim_location(location_id),
    user_id INT NOT NULL REFERENCES dim_user(user_id),
    transaction_type_id INT NOT NULL REFERENCES dim_transaction_type(transaction_type_id),
    quantity INT NOT NULL,
    occured_at TIMESTAMP NOT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inv_trans_occured ON fact_inventory_transactions(occured_at);
CREATE INDEX idx_inv_trans_product ON fact_inventory_transactions(product_id);
CREATE INDEX idx_inv_trans_company_occurred ON fact_inventory_transactions(company_id, occured_at);

CREATE TABLE dim_order_status (
    order_status_id SERIAL PRIMARY KEY,
    status_name VARCHAR(100) NOT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id)
);

CREATE TABLE fact_orders (
    order_id SERIAL PRIMARY KEY,
    supplier_id INT NOT NULL REFERENCES dim_supplier(supplier_id),
    order_status_id INT NOT NULL REFERENCES dim_order_status(order_status_id),
    order_date TIMESTAMP NOT NULL,
    expected_delivery TIMESTAMP NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_date ON fact_orders(order_date);
CREATE INDEX idx_orders_company_date ON fact_orders(company_id, order_date);

CREATE TABLE fact_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES fact_orders(order_id),
    product_id INT NOT NULL REFERENCES dim_product(product_id),
    quantity_ordered INT NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fact_scan_events (
    scan_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES dim_product(product_id),
    user_id INT NOT NULL REFERENCES dim_user(user_id),
    location_id INT NOT NULL REFERENCES dim_location(location_id),
    scanned_at TIMESTAMP NOT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scans_scanned_at ON fact_scan_events(scanned_at);
CREATE INDEX idx_scans_product ON fact_scan_events(product_id);

CREATE TABLE dim_alert_type (
    alert_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    severity INT DEFAULT 1,
    company_id INT NOT NULL REFERENCES dim_company(company_id)
);

CREATE TABLE fact_alerts (
    alert_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES dim_product(product_id),
    alert_type_id INT NOT NULL REFERENCES dim_alert_type(alert_type_id),
    triggered_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP NULL,
    message TEXT NULL,
    company_id INT NOT NULL REFERENCES dim_company(company_id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_triggered ON fact_alerts(triggered_at);
CREATE INDEX idx_alerts_unresolved ON fact_alerts(company_id, triggered_at) WHERE resolved_at IS NULL;

/*-----
--RLS
-----
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::INTEGER;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.current_company_id()
RETURNS INTEGER AS $$
DECLARE
    user_company_id INTEGER;
BEGIN
    SELECT company_id INTO user_company_id
    FROM dim_user
    WHERE user_id = app.current_user_id();
    RETURN user_company_id;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.has_permission(
    p_resource_type TEXT,
    p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM bridge_user_role
        JOIN bridge_role_permission ON bridge_user_role.role_id = bridge_role_permission.role_id
        JOIN dim_permission ON bridge_role_permission.permission_id = dim_permission.permission_id
        WHERE bridge_user_role.user_id = app.current_user_id()
        AND bridge_user_role.company_id = app.current_company_id()
        AND dim_permission.resource_type = p_resource_type
        AND dim_permission.action = p_action
    ) INTO user_has_permission;
    RETURN COALESCE(user_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE dim_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_location_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_transaction_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_order_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_alert_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_select_policy ON dim_company
    FOR SELECT USING (company_id = app.current_company_id());

CREATE POLICY location_select_policy ON dim_location
    FOR SELECT USING (company_id = app.current_company_id());

CREATE POLICY location_update_policy ON dim_location
    FOR UPDATE USING (company_id = app.current_company_id());

CREATE POLICY location_delete_policy ON dim_location
    FOR DELETE USING (
        company_id = app.current_company_id()
        AND app.has_permission('Location', 'delete')
    );

CREATE POLICY product_select_policy ON dim_product
    FOR SELECT USING (company_id = app.current_company_id());

CREATE POLICY product_insert_policy ON dim_product
    FOR INSERT WITH CHECK (
        company_id = app.current_company_id()
        AND app.has_permission('Product', 'create')
    );

CREATE POLICY product_update_policy ON dim_product
    FOR UPDATE USING (
        company_id = app.current_company_id()
        AND app.has_permission('Product', 'update')
    );

CREATE POLICY user_select_policy ON dim_user
    FOR SELECT USING (
        company_id = app.current_company_id()
        AND (user_id = app.current_user_id() OR app.has_permission('USER', 'update'))
    );

CREATE POLICY role_select_policy ON dim_role
    FOR SELECT USING (
        company_id IS NULL
        OR company_id = app.current_company_id()
    );

CREATE POLICY inventory_select_policy ON fact_inventory_transactions
    FOR SELECT USING (company_id = app.current_company_id());

CREATE POLICY inventory_insert_policy ON fact_inventory_transactions
    FOR INSERT WITH CHECK (
        company_id = app.current_company_id()
        AND app.has_permission('Inventory', 'create')
    );

CREATE POLICY inventory_update_policy ON fact_inventory_transactions
    FOR UPDATE USING (
        company_id = app.current_company_id()
        AND app.has_permission('Inventory', 'update')
    );

CREATE POLICY scan_select_policy ON fact_scan_events
    FOR SELECT USING (
        company_id = app.current_company_id()
        AND (user_id = app.current_user_id() OR app.has_permission('Scan', 'view_all'))
    );

CREATE POLICY scan_insert_policy ON fact_scan_events
    FOR INSERT WITH CHECK (
        company_id = app.current_company_id()
        AND user_id = app.current_user_id()
    );

CREATE POLICY alert_select_policy ON fact_alerts
    FOR SELECT USING (company_id = app.current_company_id());

CREATE POLICY alert_update_policy ON fact_alerts
    FOR UPDATE USING (
        company_id = app.current_company_id()
        AND app.has_permission('Alert', 'resolve')
    );

-----
--RPC
-----
CREATE OR REPLACE FUNCTION rpc_create_inventory_transaction(
    p_product_id INTEGER,
    p_location_id INTEGER,
    p_transaction_type VARCHAR(100),
    p_quantity INTEGER,
    p_occured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS INTEGER AS $$
DECLARE
    v_transaction_type_id INTEGER;
    v_user_id INTEGER;
    v_company_id INTEGER;
    v_new_transaction_id INTEGER;
BEGIN
    v_user_id := app.current_user_id();
    v_company_id := app.current_company_id();

    IF NOT app.has_permission('Inventory', 'create') THEN
        RAISE EXCEPTION 'Permission denied: Cannot create inventory transaction';
    END IF;

    SELECT transaction_type_id INTO v_transaction_type_id
    FROM dim_transaction_type
    WHERE type_name = p_transaction_type AND company_id = v_company_id;

    IF v_transaction_type_id IS NULL THEN
        RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM dim_product WHERE product_id = p_product_id AND company_id = v_company_id) THEN
        RAISE EXCEPTION 'Product not found or unauthorised';
    END IF;

    INSERT INTO fact_inventory_transactions (
        product_id, location_id, user_id, transaction_type_id, quantity, occured_at, company_id
    ) VALUES (
        p_product_id, p_location_id, v_user_id, v_transaction_type_id, p_quantity, p_occured_at, v_company_id
    )
    RETURNING transaction_id INTO v_new_transaction_id;

    RETURN v_new_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_get_inventory_level(
    p_product_id INTEGER,
    p_location_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    current_level INTEGER;
    v_company_id INTEGER;
BEGIN
    v_company_id := app.current_company_id();

    IF NOT EXISTS (
        SELECT 1 FROM dim_product
        WHERE product_id = p_product_id AND company_id = v_company_id
    ) THEN
        RAISE EXCEPTION 'Unauthorised access to product';
    END IF;

    SELECT COALESCE(SUM(
        CASE WHEN tt.type_name = 'RECEIVE' THEN quantity
            WHEN tt.type_name = 'SHIP' THEN -quantity
            ELSE quantity
        END
    ), 0) INTO current_level
    FROM fact_inventory_transactions fit
    JOIN dim_transaction_type tt ON fit.transaction_type_id = tt.transaction_type_id
    WHERE fit.product_id = p_product_id
    AND fit.location_id = p_location_id
    AND fit.company_id = v_company_id;

    RETURN current_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_create_alert(
    p_product_id INTEGER,
    p_alert_type VARCHAR(100),
    p_message TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_alert_type_id INTEGER;
    v_company_id INTEGER;
    v_alert_id INTEGER;
BEGIN
    v_company_id := app.current_company_id();

    SELECT alert_type_id INTO v_alert_type_id
    FROM dim_alert_type
    WHERE type_name = p_alert_type AND company_id = v_company_id;

    IF v_alert_type_id IS NULL THEN
        RAISE EXCEPTION 'Invalid alert type: %', p_alert_type;
    END IF;

    INSERT INTO fact_alerts(
        product_id, alert_type_id, triggered_at, message, company_id
    ) VALUES (
        p_product_id, v_alert_type_id, CURRENT_TIMESTAMP, p_message, v_company_id
    )
    RETURNING alert_id INTO v_alert_id;

    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_resolve_alert(
    p_alert_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_company_id INTEGER;
BEGIN
    v_company_id := app.current_company_id();

    IF NOT app.has_permission('Alert', 'resolve') THEN
        RAISE EXCEPTION 'Permission denied: Cannot resolve alerts';
    END IF;

    UPDATE fact_alerts
    SET resolved_at = CURRENT_TIMESTAMP
    WHERE alert_id = p_alert_id AND company_id = v_company_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_record_scan(
    p_barcode VARCHAR(100),
    p_location_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id INTEGER;
    v_company_id INTEGER;
    v_product_id INTEGER;
    result JSONB;
BEGIN
    v_user_id := app.current_user_id();
    v_company_id := app.current_company_id();

    SELECT product_id INTO v_product_id
    FROM dim_product
    WHERE barcode = p_barcode AND company_id = v_company_id;

    INSERT INTO fact_scan_events (
        product_id, user_id, location_id, scanned_at, company_id
    ) VALUES (
        v_product_id, v_user_id, p_location_id, CURRENT_TIMESTAMP, v_company_id
    );

    IF v_product_id IS NULL THEN
        result := jsonb_build_object(
            'status', 'unknown_product',
            'message', 'Barcode not found in inventory',
            'barcode', p_barcode
        );
    ELSE
        SELECT jsonb_build_object(
            'status', 'success',
            'product_id', product_id,
            'product_name', product_name,
            'sku', sku
        ) INTO result
        FROM dim_product
        WHERE product_id = v_product_id;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_create_user(
    p_email VARCHAR(255),
    p_full_name VARCHAR(255),
    p_role_name VARCHAR(100)
)
RETURNS INTEGER AS $$
DECLARE
    v_company_id INTEGER;
    v_role_id INTEGER;
    v_user_id INTEGER;
BEGIN
    v_company_id := app.current_company_id();

    IF NOT app.has_permission('User', 'create') THEN
        RAISE EXCEPTION 'Permission denied: Cannot create users';
    END IF;

    SELECT role_id INTO v_role_id
    FROM dim_role
    WHERE role_name = p_role_name AND company_id = v_company_id;

    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role not found: %', p_role_name;
    END IF;

    INSERT INTO dim_user (email, full_name, company_id)
    VALUES (p_email, p_full_name, v_company_id)
    RETURNING user_id INTO v_user_id;

    INSERT INTO bridge_user_role (user_id, role_id, company_id)
    VALUES (v_user_id, v_role_id, v_company_id);

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/