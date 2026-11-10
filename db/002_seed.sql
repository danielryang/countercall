-- db/002_seed.sql  (fictional company; all phone numbers are synthetic 555 placeholders.
-- scripts/seed-phones.ts then overwrites the PRIMARY (and backup) trusted phone for Acme/Northwind from env, so real
-- teammate numbers never live in git. startVerificationCall refuses any number not in ALLOWED_DEMO_NUMBERS, so an
-- un-overwritten 555 number simply fails closed with "refusing to dial".)
-- Vendor ids, domains, banks, phones and scheduled payment ids MUST equal fixtures/vendors.json (db-check asserts it).

insert into org (name, domain, ap_inbox, exec_names, approver_name)
values ('Rice Robotics', 'ricerobotics.com', 'rice-ap@agentmail.to', array['Dana Rice','Priya Natarajan'], 'A. Patel, AP Lead');

insert into vendors (id, name, legal_name, domains, known_contacts, country, typical_invoice_cents) values
 ('v_acme',      'Acme Corp',                 'Acme Industrial Supply, Inc.', array['acmecorp.com'],            array['ap@acmecorp.com','jordan.lee@acmecorp.com'], 'US', 1240000),
 ('v_globex',    'Globex Industrial Supply',  null,                           array['globex-industrial.com'],   array['billing@globex-industrial.com'],             'US',  860000),
 ('v_northwind', 'Northwind Components',      'Northwind Components GmbH',    array['northwind-components.de'], array['rechnung@northwind-components.de'],          'DE', 2100000),
 ('v_summit',    'Summit Packaging Co',       null,                           array['summitpackaging.com'],     array['ar@summitpackaging.com'],                    'US',  540000),
 ('v_kestrel',   'Kestrel Freight',           null,                           array['kestrelfreight.com'],      array['billing@kestrelfreight.com'],                'US', 1850000),
 ('v_orchard',   'Orchard Office Supply',     null,                           array['orchardoffice.com'],       array['accounts@orchardoffice.com'],                'US',  210000);

-- Trusted numbers WITH provenance. Acme has: a primary (W-9, 8 months old), a backup on a second carrier (live-final
-- insurance, same provenance), and a QUARANTINED number that appeared in Ramp this week (the "phone changed 2h ago" story:
-- we dial the oldest-provenance number, never the newest).
insert into trusted_contacts (vendor_id, phone_e164, label, source, source_doc, added_by, first_seen_at, last_verified_at, last_verified_by, status, quarantine_reason, is_primary) values
 ('v_acme',      '+14155550142', 'AP main line',        'onboarding_w9',          'W-9 + vendor form, signed 2025-03-14', 'A. Patel', '2025-03-14T17:00:00Z', '2026-09-02T18:30:00Z', 'human:A. Patel', 'trusted',     null, true),
 ('v_acme',      '+14155550143', 'AP backup line',      'contract',               'MSA 2025-03-14, schedule B',           'A. Patel', '2025-03-14T17:00:00Z', null,                   null,             'trusted',     null, false),
 ('v_acme',      '+13025550199', 'Phone changed in Ramp','ramp_contact_at_import', 'Ramp vendor contact, edited 2026-11-09', 'system',   '2026-11-09T21:00:00Z', null,                   null,             'quarantined', 'Changed in Ramp 2026-11-09, inside the change window; not eligible to be dialed', false),
 ('v_globex',    '+14155550177', 'AP main line',        'onboarding_w9',          'W-9 signed 2025-06-02',                'A. Patel', '2025-06-02T17:00:00Z', '2026-06-10T18:00:00Z', 'call:prior', 'trusted', null, true),
 ('v_northwind', '+14155550163', 'Buchhaltung',         'contract',               'Supply agreement 2025-08-19',          'A. Patel', '2025-08-19T17:00:00Z', null,                   null,             'trusted',     null, true),
 ('v_summit',    '+12065550117', 'AR desk',             'onboarding_w9',          'W-9 signed 2025-09-30',                'A. Patel', '2025-09-30T17:00:00Z', null,                   null,             'trusted',     null, true),
 ('v_kestrel',   '+12065550134', 'Billing',             'vendor_website',         'kestrelfreight.com/contact, 2025-11-12','A. Patel','2025-11-12T17:00:00Z', null,                   null,             'trusted',     null, true),
 ('v_orchard',   '+14155550188', 'Accounts',            'onboarding_w9',          'W-9 signed 2026-01-20',                'A. Patel', '2026-01-20T17:00:00Z', null,                   null,             'trusted',     null, true);

insert into bank_accounts (vendor_id, bank_name, routing_number, account_last4, first_seen_at, verified_at, verified_by) values
 ('v_acme',      'Embarcadero Community Bank',   '121007775', '4417', '2025-03-14T17:00:00Z', '2025-03-14T17:00:00Z', 'human:A. Patel'),
 ('v_globex',    'Harbor Trust',                 '026008811', '9021', '2025-06-02T17:00:00Z', '2025-06-02T17:00:00Z', 'human:A. Patel'),
 ('v_northwind', 'Pacific Savings',              '061004126', '7730', '2025-08-19T17:00:00Z', '2025-08-19T17:00:00Z', 'human:A. Patel'),
 ('v_summit',    'Cascade Federal Credit Union', '101000019', '8120', '2025-09-30T17:00:00Z', '2025-09-30T17:00:00Z', 'human:A. Patel'),
 ('v_kestrel',   'Pioneer Business Bank',        '202000028', '3359', '2025-11-12T17:00:00Z', '2025-11-12T17:00:00Z', 'human:A. Patel'),
 ('v_orchard',   'Mission Valley Bank',          '303000037', '6642', '2026-01-20T17:00:00Z', '2026-01-20T17:00:00Z', 'human:A. Patel');

-- Scheduled (open) bills: ids match fixtures/vendors.json scheduledPaymentIds. Acme has two = $24,800 held in the hero.
insert into bills (id, vendor_id, invoice_number, amount_cents, due_date) values
 ('pay_8101', 'v_acme',      '4471',    1240000, '2026-11-13'),
 ('pay_8102', 'v_acme',      '4472',    1240000, '2026-12-05'),
 ('pay_8201', 'v_globex',    '7710',     860000, '2026-11-18'),
 ('pay_8301', 'v_northwind', 'NW-2041', 2100000, '2026-11-20'),
 ('pay_8401', 'v_summit',    'SP-1190',  540000, '2026-11-24'),
 ('pay_8501', 'v_kestrel',   'KF-3302', 1850000, '2026-11-17'),
 ('pay_8601', 'v_orchard',   'OO-5512',  210000, '2026-11-30');

-- Paid history: the newest paid bill per vendor is the source of the default verification challenge
-- ("last four digits of the invoice number on your most recent paid bill"). Digits only, and NOT present in any fixture email.
insert into bills (id, vendor_id, invoice_number, amount_cents, due_date, paid_at, ramp_status_summary) values
 ('pay_7001', 'v_acme',      '4388',    1195000, '2026-10-16', '2026-10-16T16:00:00Z', 'PAYMENT_COMPLETED'),
 ('pay_7002', 'v_acme',      '4301',    1240000, '2026-09-18', '2026-09-18T16:00:00Z', 'PAYMENT_COMPLETED'),
 ('pay_7101', 'v_globex',    '7655',     860000, '2026-10-20', '2026-10-20T16:00:00Z', 'PAYMENT_COMPLETED'),
 ('pay_7201', 'v_northwind', 'NW-1988', 2100000, '2026-10-22', '2026-10-22T16:00:00Z', 'PAYMENT_COMPLETED'),
 ('pay_7301', 'v_summit',    'SP-1042',  540000, '2026-10-26', '2026-10-26T16:00:00Z', 'PAYMENT_COMPLETED'),
 ('pay_7401', 'v_kestrel',   'KF-3190', 1850000, '2026-10-19', '2026-10-19T16:00:00Z', 'PAYMENT_COMPLETED'),
 ('pay_7501', 'v_orchard',   'OO-5390',  210000, '2026-10-28', '2026-10-28T16:00:00Z', 'PAYMENT_COMPLETED');
