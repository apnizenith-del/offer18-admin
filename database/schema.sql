-- Offer18 Admin Panel (Next.js + MySQL) - baseline schema
-- Engine: InnoDB, charset: utf8mb4

-- AUTH + RBAC
CREATE TABLE IF NOT EXISTS admin_users (
  id              CHAR(26) PRIMARY KEY,
  email           VARCHAR(190) NOT NULL UNIQUE,
  username        VARCHAR(80) UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  mfa_enabled     TINYINT(1) NOT NULL DEFAULT 0,
  mfa_secret      VARCHAR(255) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id              CHAR(26) PRIMARY KEY,
  admin_id        CHAR(26) NOT NULL,
  token_hash      CHAR(64) NOT NULL UNIQUE,
  ip              VARCHAR(64) NULL,
  user_agent      VARCHAR(255) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at      DATETIME(3) NOT NULL,
  revoked_at      DATETIME(3) NULL,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  INDEX idx_admin_sessions_admin (admin_id, expires_at),
  INDEX idx_admin_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id          CHAR(26) PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
  id          CHAR(26) PRIMARY KEY,
  perm_key    VARCHAR(120) NOT NULL UNIQUE,
  module      VARCHAR(60) NOT NULL,
  label       VARCHAR(190) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_permissions_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  id             CHAR(26) PRIMARY KEY,
  role_id        CHAR(26) NOT NULL,
  permission_id  CHAR(26) NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_role_perm (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_role_map (
  id        CHAR(26) PRIMARY KEY,
  admin_id  CHAR(26) NOT NULL,
  role_id   CHAR(26) NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY uq_admin_role (admin_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_login_logs (
  id          CHAR(26) PRIMARY KEY,
  admin_id    CHAR(26) NULL,
  email       VARCHAR(190) NULL,
  ip          VARCHAR(64) NULL,
  user_agent  VARCHAR(255) NULL,
  success     TINYINT(1) NOT NULL DEFAULT 1,
  reason      VARCHAR(190) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_admin_login_logs_admin (admin_id, created_at),
  INDEX idx_admin_login_logs_ip (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AUDIT
CREATE TABLE IF NOT EXISTS audit_logs (
  id              CHAR(26) PRIMARY KEY,
  actor_admin_id  CHAR(26) NULL,
  actor_type      VARCHAR(20) NOT NULL DEFAULT 'admin',
  action          VARCHAR(80) NOT NULL,
  entity_type     VARCHAR(60) NOT NULL,
  entity_id       CHAR(26) NOT NULL,
  meta            JSON NULL,
  ip              VARCHAR(64) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_entity (entity_type, entity_id, created_at),
  INDEX idx_audit_actor (actor_admin_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AFFILIATES
CREATE TABLE IF NOT EXISTS affiliates (
  id            CHAR(26) PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending',
  traffic_sources JSON NULL,
  risk_level    VARCHAR(20) NOT NULL DEFAULT 'normal',
  currency      VARCHAR(10) NOT NULL DEFAULT 'USD',
  payout_model  VARCHAR(30) NOT NULL DEFAULT 'default',
  notes         TEXT NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_aff_status (status, created_at),
  INDEX idx_aff_risk (risk_level, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ADVERTISERS
CREATE TABLE IF NOT EXISTS advertisers (
  id          CHAR(26) PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL UNIQUE,
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OFFERS
CREATE TABLE IF NOT EXISTS offers (
  id            CHAR(26) PRIMARY KEY,
  advertiser_id CHAR(26) NULL,
  name          VARCHAR(180) NOT NULL,
  description   TEXT NULL,
  category      VARCHAR(80) NULL,
  type          VARCHAR(10) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  currency      VARCHAR(10) NOT NULL DEFAULT 'USD',
  payout_default  DECIMAL(18,6) NOT NULL DEFAULT 0,
  revenue_default DECIMAL(18,6) NOT NULL DEFAULT 0,
  allow_incent  TINYINT(1) NOT NULL DEFAULT 0,
  traffic_restrictions JSON NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (advertiser_id) REFERENCES advertisers(id) ON DELETE SET NULL,
  INDEX idx_offers_status (status, updated_at),
  INDEX idx_offers_adv (advertiser_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offer_tracking (
  id          CHAR(26) PRIMARY KEY,
  offer_id    CHAR(26) NOT NULL UNIQUE,
  preview_url VARCHAR(255) NULL,
  track_url   VARCHAR(500) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offer_caps (
  id          CHAR(26) PRIMARY KEY,
  offer_id    CHAR(26) NOT NULL,
  cap_type    VARCHAR(10) NOT NULL,
  cap_limit   INT NOT NULL,
  timezone    VARCHAR(60) NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  INDEX idx_offer_caps (offer_id, cap_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offer_rules (
  id            CHAR(26) PRIMARY KEY,
  offer_id      CHAR(26) NOT NULL UNIQUE,
  duplicate_rule JSON NULL,
  conversion_window_sec INT NULL,
  hold_period_sec INT NULL,
  rule_json     JSON NULL,
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offer_target_geo (
  id        CHAR(26) PRIMARY KEY,
  offer_id  CHAR(26) NOT NULL,
  country   CHAR(2) NOT NULL,
  mode      VARCHAR(10) NOT NULL DEFAULT 'allow',
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  INDEX idx_offer_geo (offer_id, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offer_target_device (
  id        CHAR(26) PRIMARY KEY,
  offer_id  CHAR(26) NOT NULL,
  device    VARCHAR(30) NOT NULL,
  mode      VARCHAR(10) NOT NULL DEFAULT 'allow',
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  INDEX idx_offer_device (offer_id, device)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offer_time_targeting (
  id        CHAR(26) PRIMARY KEY,
  offer_id  CHAR(26) NOT NULL,
  days_json JSON NULL,
  hours_json JSON NULL,
  timezone  VARCHAR(60) NULL,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS affiliate_offer_access (
  id           CHAR(26) PRIMARY KEY,
  affiliate_id CHAR(26) NOT NULL,
  offer_id     CHAR(26) NOT NULL,
  is_allowed   TINYINT(1) NOT NULL DEFAULT 1,
  is_private   TINYINT(1) NOT NULL DEFAULT 0,
  payout_override DECIMAL(18,6) NULL,
  cap_daily_override INT NULL,
  cap_hourly_override INT NULL,
  flags_json   JSON NULL,
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_aff_offer (affiliate_id, offer_id),
  INDEX idx_offer_access_offer (offer_id, is_allowed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TRACKING
CREATE TABLE IF NOT EXISTS clicks (
  id           CHAR(26) PRIMARY KEY,
  offer_id     CHAR(26) NOT NULL,
  affiliate_id CHAR(26) NOT NULL,
  smartlink_id CHAR(26) NULL,
  subid1       VARCHAR(120) NULL,
  subid2       VARCHAR(120) NULL,
  subid3       VARCHAR(120) NULL,
  source       VARCHAR(120) NULL,
  ip           VARCHAR(64) NULL,
  ua           VARCHAR(255) NULL,
  country      CHAR(2) NULL,
  device       VARCHAR(30) NULL,
  os           VARCHAR(40) NULL,
  browser      VARCHAR(40) NULL,
  referer      VARCHAR(500) NULL,
  is_unique    TINYINT(1) NOT NULL DEFAULT 0,
  fingerprint  VARCHAR(64) NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE RESTRICT,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE RESTRICT,
  INDEX idx_click_offer_time (offer_id, created_at),
  INDEX idx_click_aff_time (affiliate_id, created_at),
  INDEX idx_click_country_time (country, created_at),
  INDEX idx_click_subid1_time (subid1, created_at),
  INDEX idx_click_fp_time (fingerprint, created_at),
  INDEX idx_click_ip_time (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversions (
  id           CHAR(26) PRIMARY KEY,
  offer_id     CHAR(26) NOT NULL,
  affiliate_id CHAR(26) NOT NULL,
  click_id     CHAR(26) NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  payout       DECIMAL(18,6) NOT NULL DEFAULT 0,
  revenue      DECIMAL(18,6) NOT NULL DEFAULT 0,
  currency     VARCHAR(10) NOT NULL DEFAULT 'USD',
  goal         VARCHAR(60) NULL,
  transaction_id VARCHAR(120) NULL,
  subid1       VARCHAR(120) NULL,
  subid2       VARCHAR(120) NULL,
  ip           VARCHAR(64) NULL,
  country      CHAR(2) NULL,
  meta         JSON NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE RESTRICT,
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE RESTRICT,
  INDEX idx_conv_status_time (status, created_at),
  INDEX idx_conv_offer_time (offer_id, created_at),
  INDEX idx_conv_aff_time (affiliate_id, created_at),
  INDEX idx_conv_click (click_id),
  UNIQUE KEY uq_conv_txn_offer (offer_id, transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversion_status_history (
  id            CHAR(26) PRIMARY KEY,
  conversion_id CHAR(26) NOT NULL,
  from_status   VARCHAR(20) NOT NULL,
  to_status     VARCHAR(20) NOT NULL,
  reason        VARCHAR(190) NULL,
  actor_admin_id CHAR(26) NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (conversion_id) REFERENCES conversions(id) ON DELETE CASCADE,
  INDEX idx_conv_hist (conversion_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fraud_events (
  id          CHAR(26) PRIMARY KEY,
  affiliate_id CHAR(26) NULL,
  offer_id    CHAR(26) NULL,
  click_id    CHAR(26) NULL,
  conversion_id CHAR(26) NULL,
  event_type  VARCHAR(60) NOT NULL,
  severity    VARCHAR(10) NOT NULL DEFAULT 'low',
  meta        JSON NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_fraud_aff (affiliate_id, created_at),
  INDEX idx_fraud_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
