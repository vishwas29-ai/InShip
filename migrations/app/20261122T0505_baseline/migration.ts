#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6e51f9ee567857947f7e7a6a4f43c6d1633e753bde02f3ca04a139e5cf5fff73/contract';
import endContract from '../../snapshots/6e51f9ee567857947f7e7a6a4f43c6d1633e753bde02f3ca04a139e5cf5fff73/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Order',
        columns: [
          col('billableKm', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('deliveryAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('deliveryPin', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('distanceKm', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pickupAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pickupPin', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PLACED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalCharge', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Order_status_check_675c73a1',
            sql`"status" IN ('PLACED', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')`,
          ),
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
