#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/149f7d4423c5461988c225361a1759a2f9c57c57f95bd10023c32dc7d01b7359/contract';
import endContract from '../../snapshots/149f7d4423c5461988c225361a1759a2f9c57c57f95bd10023c32dc7d01b7359/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'idempotency_keys',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('endpoint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('response', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'invoice_balance_transfers',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source_invoice_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('target_invoice_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('transferred_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'invoice_items',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('invoice_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('property_charge_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('total_amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unit_amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'invoices',
        columns: [
          col('amount_paid', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('balance_due', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('due_date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('invoice_number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('issue_date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('subtotal', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('tenancy_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('tenant_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('total_amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'payment_allocations',
        columns: [
          col('allocated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('invoice_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payment_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'payments',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('invoice_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payment_date', 'date', {
            notNull: true,
            codecRef: { codecId: 'pg/date-temporal@1' },
          }),
          col('payment_method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('reference_number', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenant_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'properties',
        columns: [
          col('address_line_1', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('address_line_2', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('country', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('currency', 'text', {
            notNull: true,
            default: lit('KES'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('monthly_rent', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postal_code', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('state', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'property_charges',
        columns: [
          col('amount', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('billing_frequency', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('is_active', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'receipts',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('issued_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payment_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('receipt_number', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tenancies',
        columns: [
          col('assigned_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('end_date', 'date', { codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('monthly_rent', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('property_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('property_unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('start_date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenant_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('unassigned_at', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tenants',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emergency_contact_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('emergency_contact_phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('first_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('last_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('manager_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('first_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('last_name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organization', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('password_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('administrator'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'idempotency_keys',
        constraint: 'idempotency_keys_key_key',
        columns: ['key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'invoices',
        constraint: 'invoices_invoice_number_key',
        columns: ['invoice_number'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'receipts',
        constraint: 'receipts_payment_id_key',
        columns: ['payment_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'receipts',
        constraint: 'receipts_receipt_number_key',
        columns: ['receipt_number'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'idempotency_keys',
        index: 'idempotency_keys_key_idx_2077e847',
        columns: ['key'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'idempotency_keys',
        index: 'idempotency_keys_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoice_balance_transfers',
        index: 'inv_bal_tx_mgr_src_idx',
        columns: ['manager_id', 'source_invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoice_balance_transfers',
        index: 'invoice_balance_transfers_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoice_balance_transfers',
        index: 'invoice_balance_transfers_source_invoice_id_idx_73ae08f2',
        columns: ['source_invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoice_balance_transfers',
        index: 'invoice_balance_transfers_target_invoice_id_idx_f14fb2b5',
        columns: ['target_invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoice_items',
        index: 'invoice_items_invoice_id_idx_a3b7555d',
        columns: ['invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoice_items',
        index: 'invoice_items_property_charge_id_idx_aad71636',
        columns: ['property_charge_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoices',
        index: 'invoices_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoices',
        index: 'invoices_manager_id_tenant_id_tenancy_id_status_idx_94eb0ddf',
        columns: ['manager_id', 'tenant_id', 'tenancy_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoices',
        index: 'invoices_property_id_idx_9fa9619b',
        columns: ['property_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoices',
        index: 'invoices_tenancy_id_idx_c0f9e2da',
        columns: ['tenancy_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invoices',
        index: 'invoices_tenant_id_idx_41c0d441',
        columns: ['tenant_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment_allocations',
        index: 'payment_allocations_invoice_id_idx_a3b7555d',
        columns: ['invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment_allocations',
        index: 'payment_allocations_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment_allocations',
        index: 'payment_allocations_manager_id_invoice_id_idx_633704ab',
        columns: ['manager_id', 'invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment_allocations',
        index: 'payment_allocations_payment_id_idx_7931cf41',
        columns: ['payment_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_invoice_id_idx_a3b7555d',
        columns: ['invoice_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_manager_id_tenant_id_payment_date_idx_d119c9fe',
        columns: ['manager_id', 'tenant_id', 'payment_date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_property_id_idx_9fa9619b',
        columns: ['property_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_tenant_id_idx_41c0d441',
        columns: ['tenant_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'properties',
        index: 'properties_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_charges',
        index: 'property_charges_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property_charges',
        index: 'property_charges_property_id_idx_9fa9619b',
        columns: ['property_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'receipts',
        index: 'receipts_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenancies',
        index: 'tenancies_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenancies',
        index: 'tenancies_property_id_idx_9fa9619b',
        columns: ['property_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenancies',
        index: 'tenancies_property_id_status_idx_7a5ca777',
        columns: ['property_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenancies',
        index: 'tenancies_tenant_id_idx_41c0d441',
        columns: ['tenant_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenancies',
        index: 'tenancies_tenant_id_status_idx_788669e7',
        columns: ['tenant_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tenants',
        index: 'tenants_manager_id_idx_c3dee277',
        columns: ['manager_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoice_balance_transfers',
        foreignKey: {
          name: 'invoice_balance_transfers_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoice_balance_transfers',
        foreignKey: {
          name: 'invoice_balance_transfers_source_invoice_id_fkey',
          columns: ['source_invoice_id'],
          references: { schema: 'public', table: 'invoices', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoice_balance_transfers',
        foreignKey: {
          name: 'invoice_balance_transfers_target_invoice_id_fkey',
          columns: ['target_invoice_id'],
          references: { schema: 'public', table: 'invoices', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoice_items',
        foreignKey: {
          name: 'invoice_items_invoice_id_fkey',
          columns: ['invoice_id'],
          references: { schema: 'public', table: 'invoices', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoice_items',
        foreignKey: {
          name: 'invoice_items_property_charge_id_fkey',
          columns: ['property_charge_id'],
          references: { schema: 'public', table: 'property_charges', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoices',
        foreignKey: {
          name: 'invoices_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoices',
        foreignKey: {
          name: 'invoices_property_id_fkey',
          columns: ['property_id'],
          references: { schema: 'public', table: 'properties', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoices',
        foreignKey: {
          name: 'invoices_tenancy_id_fkey',
          columns: ['tenancy_id'],
          references: { schema: 'public', table: 'tenancies', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invoices',
        foreignKey: {
          name: 'invoices_tenant_id_fkey',
          columns: ['tenant_id'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment_allocations',
        foreignKey: {
          name: 'payment_allocations_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment_allocations',
        foreignKey: {
          name: 'payment_allocations_payment_id_fkey',
          columns: ['payment_id'],
          references: { schema: 'public', table: 'payments', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment_allocations',
        foreignKey: {
          name: 'payment_allocations_invoice_id_fkey',
          columns: ['invoice_id'],
          references: { schema: 'public', table: 'invoices', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payments',
        foreignKey: {
          name: 'payments_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payments',
        foreignKey: {
          name: 'payments_property_id_fkey',
          columns: ['property_id'],
          references: { schema: 'public', table: 'properties', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payments',
        foreignKey: {
          name: 'payments_invoice_id_fkey',
          columns: ['invoice_id'],
          references: { schema: 'public', table: 'invoices', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payments',
        foreignKey: {
          name: 'payments_tenant_id_fkey',
          columns: ['tenant_id'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'properties',
        foreignKey: {
          name: 'properties_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property_charges',
        foreignKey: {
          name: 'property_charges_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property_charges',
        foreignKey: {
          name: 'property_charges_property_id_fkey',
          columns: ['property_id'],
          references: { schema: 'public', table: 'properties', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'receipts',
        foreignKey: {
          name: 'receipts_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'receipts',
        foreignKey: {
          name: 'receipts_payment_id_fkey',
          columns: ['payment_id'],
          references: { schema: 'public', table: 'payments', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenancies',
        foreignKey: {
          name: 'tenancies_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenancies',
        foreignKey: {
          name: 'tenancies_property_id_fkey',
          columns: ['property_id'],
          references: { schema: 'public', table: 'properties', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenancies',
        foreignKey: {
          name: 'tenancies_tenant_id_fkey',
          columns: ['tenant_id'],
          references: { schema: 'public', table: 'tenants', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tenants',
        foreignKey: {
          name: 'tenants_manager_id_fkey',
          columns: ['manager_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
