import type { FastifyInstance } from 'fastify';

type PgLike = Pick<FastifyInstance['pg'], 'query'>;

export interface TarotHistoryInsertParams {
  userId: number;
  drawType: string;
  drawTypeLabel: string;
  drawPersona: string;
  drawPersonaLabel: string;
  cardsContent: string;
  cardsPayload: unknown[];
  userNotes: string;
  interpretation: string;
}

export async function ensureTarotHistoryTable(pg: PgLike) {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS tarot_history_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      draw_type VARCHAR(16) NOT NULL,
      draw_type_label VARCHAR(32) NOT NULL,
      draw_persona VARCHAR(16) NOT NULL,
      draw_persona_label VARCHAR(32) NOT NULL,
      cards_content TEXT NOT NULL,
      cards_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
      user_notes TEXT NOT NULL DEFAULT '',
      interpretation TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_tarot_history_records_user_created_at
    ON tarot_history_records (user_id, created_at DESC)
  `);
}

export async function insertTarotHistoryRecord(pg: PgLike, params: TarotHistoryInsertParams) {
  const { rows } = await pg.query(
    `
      INSERT INTO tarot_history_records (
        user_id,
        draw_type,
        draw_type_label,
        draw_persona,
        draw_persona_label,
        cards_content,
        cards_payload,
        user_notes,
        interpretation
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
      RETURNING *
    `,
    [
      params.userId,
      params.drawType,
      params.drawTypeLabel,
      params.drawPersona,
      params.drawPersonaLabel,
      params.cardsContent,
      JSON.stringify(params.cardsPayload),
      params.userNotes,
      params.interpretation,
    ],
  );

  return rows[0];
}

export async function listTarotHistoryRecords(pg: PgLike, userId: number, pageNo: number, pageSize: number) {
  // 计算偏移量
  const offset = (pageNo - 1) * pageSize;

  const { rows } = await pg.query(
    `
      SELECT
        id,
        draw_type,
        draw_type_label,
        draw_persona,
        draw_persona_label,
        cards_content,
        cards_payload,
        user_notes,
        interpretation,
        created_at
      FROM tarot_history_records
      WHERE user_id = $1
        AND NULLIF(BTRIM(interpretation), '') IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, pageSize, offset],
  );

  return rows;
}
