// utils/commonUtils.js
import { EmbedBuilder } from 'discord.js';
import { pool } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * 📝 Interaction Log 저장 + 로그 채널 발송 함수
 */
export async function logInteraction(interaction, logData = {}, logChannelId = process.env.LOG_CHANNEL_ID) {
  try {
    const guildId = interaction?.guild?.id ?? interaction?.guildId ?? null;
    const userId = interaction?.user?.id ?? interaction?.author?.id ?? null;

    // BigInt → string 변환 방지 처리
    const safeLogData = JSON.parse(JSON.stringify(logData, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    // DB 로그 저장
    await pool.query(
      `INSERT INTO interaction_logs (guild_id, user_id, command, details) VALUES (?, ?, ?, ?)`,
      [guildId, userId, safeLogData.Action || safeLogData.command || 'log', JSON.stringify(safeLogData)]
    );

    // 로그 채널 출력이 비활성화된 경우 종료
    if (!logChannelId) return;

    const ch = await interaction.client.channels.fetch(String(logChannelId)).catch(() => null);
    if (!ch || !ch.send) return;

    const embed = new EmbedBuilder()
      .setTitle('🧾 Interaction Log')
      .setColor('Blue')
      .setTimestamp()
      .setFooter({ text: interaction?.user?.tag || 'System' });

    for (const [k, v] of Object.entries(safeLogData)) {
      let value = v;
      if (typeof v === 'object') {
        value = '```json\n' + JSON.stringify(v, null, 2).slice(0, 1010) + '\n```';
      }
      embed.addFields({ name: String(k).slice(0, 256), value: String(value).slice(0, 1024) });
    }

    await ch.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.warn('logInteraction error:', err?.message || err);
  }
}

/**
 * 🔑 서버의 Bloxlink API 키 조회
 */
export async function getGuildBloxlinkKey(guildId) {
  const [rows] = await pool.query(`SELECT bloxlink_api FROM guild_settings WHERE guild_id = ?`, [guildId]);
  if (!rows.length) return null;
  return rows[0].bloxlink_api || null;
}

/**
 * 🧍 members 테이블에 유저 정보 존재 보장 + 기본값 생성
 */
export async function ensureMemberData(guildId, userId) {
  const [rows] = await pool.query(`SELECT * FROM members WHERE guild_id = ? AND user_id = ?`, [guildId, userId]);
  if (rows.length === 0) {
    await pool.query(
      `INSERT INTO members (guild_id, user_id, \`rank\`, status) VALUES (?, ?, 'UnRanked', 'Active')`,
      [guildId, userId]
    );
    return { guild_id: guildId, user_id: userId, rank: 'UnRanked', status: 'Active', clan: null };
  }

  return rows[0];
}
