// utils/sessionUtils.js
import { EmbedBuilder } from "discord.js";
import { pool } from "../config/db.js";
import { getRobloxInfo } from "./robloxUtils.js";
import { examinerRoles } from "../config/rolemap.js";
import { buildSessionButtons } from "./buildSessionButtons.js";

/**
 * 세션 정보 가져오기
 */
export async function getSessionById(sessionId) {
  const [[session]] = await pool.query(
    `SELECT * FROM test_sessions WHERE session_id = ?`,
    [sessionId]
  );
  return session || null;
}

/**
 * 참가자 목록 가져오기
 */
export async function getParticipants(sessionId) {
  const [rows] = await pool.query(
    `SELECT user_id FROM session_participants WHERE session_id = ? ORDER BY joined_at ASC`,
    [sessionId]
  );
  return rows.map(r => r.user_id);
}

/**
 * 시험관 목록 가져오기
 */
export async function getTesters(sessionId) {
  const [rows] = await pool.query(
    `SELECT user_id FROM session_testers WHERE session_id = ?`,
    [sessionId]
  );
  return rows.map(r => r.user_id);
}

/**
 * 참가 등록 (중복 X, 시험관 X)
 */
export async function addParticipant(sessionId, userId) {
  const testers = await getTesters(sessionId);
  if (testers.includes(userId)) return false;

  // ✅ 이미 호출된 사람인지 확인
  const [[history]] = await pool.query(
    `SELECT user_id FROM session_history WHERE session_id = ? AND user_id = ? LIMIT 1`,
    [sessionId, userId]
  );
  if (history) return false; // 🔥 재참가 불가

  // ✅ 참가자 테이블에 추가
  await pool.query(
    `INSERT IGNORE INTO session_participants (session_id, user_id) VALUES (?, ?)`,
    [sessionId, userId]
  );
  return true;
}


/**
 * 다음 참가자 호출
 */
export async function callNext(sessionId) {
  const participants = await getParticipants(sessionId);
  if (participants.length === 0) return null;

  const next = participants[0];

  // ✅ 참가자 목록에서 제거
  await pool.query(
    `DELETE FROM session_participants WHERE session_id = ? AND user_id = ?`,
    [sessionId, next]
  );

  // ✅ 호출된 사람을 히스토리 테이블에 기록
  await pool.query(
    `INSERT IGNORE INTO session_history (session_id, user_id) VALUES (?, ?)`,
    [sessionId, next]
  );

  return next;
}


/**
 * 모집 종료 (Join 비활성화용)
 */
export async function stopRecruiting(sessionId) {
  await pool.query(
    `UPDATE test_sessions SET is_recruiting = 0 WHERE session_id = ?`,
    [sessionId]
  );
}

/**
 * 시험관 여부 확인
 */
export async function isExaminer(member, sessionId) {
  if (member.id === process.env.OWNER_ID) return true;
  const testers = await getTesters(sessionId);
  if (testers.includes(member.id)) return true;
  if (member.roles.cache.some(r => examinerRoles.includes(r.id))) return true;
  return false;
}

/**
 * 버튼에서 session_id 추출
 */
export function getSessionIdFromCustomId(customId) {
  const parts = customId.split("_");
  return Number(parts[parts.length - 1]) || null;
}

/**
 * 세션 UI 업데이트
 */
export async function updateSessionEmbed(session, client) {
  try {
    const fresh = await getSessionById(session.session_id);
    if (!fresh) return;

    const channel = await client.channels.fetch(fresh.channel_id).catch(() => null);
    if (!channel) return;

    const msg = await channel.messages.fetch(fresh.message_id).catch(() => null);
    if (!msg) return;

    const testers = await getTesters(fresh.session_id);
    const participants = await getParticipants(fresh.session_id);

    const [[keyRow]] = await pool.query(
      `SELECT bloxlink_api FROM guild_settings WHERE guild_id = ?`,
      [fresh.guild_id]
    );
    const apiKey = keyRow?.bloxlink_api || null;

    // ✅ 시험관 카드 생성
    const testerCards = await Promise.all(
      testers.map(async (id) => {
        const info = await getRobloxInfo(id, apiKey, fresh.guild_id);
        return info
          ? `**<@${id}>**\nRoblox: **${info.name}**\nDisplay: **${info.displayName}**`
          : `**<@${id}>**\n❌ Bloxlink Not Verified`;
      })
    );

    // ✅ 참가자 카드 생성
    const participantCards = await Promise.all(
      participants.map(async (id, index) => {
        const info = await getRobloxInfo(id, apiKey, fresh.guild_id);
        return info
          ? `### 🎟️ Participant #${index + 1}\n<@${id}>\n**Roblox:** ${info.name}\n**Display Name:** ${info.displayName}`
          : `### 🎟️ Participant #${index + 1}\n<@${id}>\n❌ **Bloxlink Not Verified**`;
      })
    );

    const participantText = participantCards.length
      ? participantCards.join("\n\n")
      : "*There are no participants yet.*";

    // ✅ 시험관 Embed (이제 이름 + display 포함)
    const examinerEmbed = new EmbedBuilder()
      .setTitle("🧑‍💻 Examiners")
      .setDescription(testerCards.length ? testerCards.join("\n\n") : "*None*")
      .setColor("#00BFFF");

    const infoEmbed = new EmbedBuilder()
      .setTitle("📍 Test Session Details")
      .addFields(
        { name: "Region", value: fresh.region, inline: true },
        { name: "Host", value: fresh.hoster_tag, inline: true },
        { name: "Status", value: 
            fresh.status === "OPEN" ? "🟢 Open" :
            fresh.status === "STOPPED" ? "🟡 Stopped (No more joins)" :
            "🔴 Closed",
          inline: true
        },
        { name: "Private Link", value: "🔒 *Hidden — Sent via DM when called*", inline: false }
      )
      .setColor("#00BFFF");


    const participantEmbed = new EmbedBuilder()
      .setTitle(`👥 Participants (${participants.length})`)
      .setDescription(participantText.slice(0, 4096))
      .setColor("#00BFFF");

    await msg.edit({
      embeds: [examinerEmbed, infoEmbed, participantEmbed],
      components: buildSessionButtons(fresh)
    });

  } catch (err) {
    console.warn(`⚠️ Failed to update session embed: ${err.message}`);
  }
}
