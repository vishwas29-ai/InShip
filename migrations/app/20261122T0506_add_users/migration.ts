#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1e3256ea434848b728f521f2516a37e277db4b8480a7e7d2f9f6c6d573afdd24/contract';
import endContract from '../../snapshots/1e3256ea434848b728f521f2516a37e277db4b8480a7e7d2f9f6c6d573afdd24/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6e51f9ee567857947f7e7a6a4f43c6d1633e753bde02f3ca04a139e5cf5fff73/contract';
import startContract from '../../snapshots/6e51f9ee567857947f7e7a6a4f43c6d1633e753bde02f3ca04a139e5cf5fff73/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_phone_key',
        columns: ['phone'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
