import { pool } from "../../config/db.js";
import { getSessionById, isExaminer, updateSessionEmbed } from "../../utils/sessionUtils.js";

export default {
  customIdStartsWith: "stop_",

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const sessionId = parseInt(interaction.customId.split("_")[1]);
    const session = await getSessionById(sessionId);
    if (!session) return interaction.editReply("❌ Session not found.");

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!(await isExaminer(member, sessionId))) {
      return interaction.editReply("🚫 Only examiners / host can stop this session.");
    }

    // ✅ 세션 상태 변경
    await pool.query(`UPDATE test_sessions SET status = 'CLOSED', is_recruiting = 0 WHERE session_id = ?`, [sessionId]);

    // ✅ 생성된 호출 채널 모두 불러오기
    const [rows] = await pool.query(
      `SELECT channel_id FROM session_call_channels WHERE session_id = ?`,
      [sessionId]
    );

    // ✅ 채널 삭제
    for (const row of rows) {
      const ch = interaction.guild.channels.cache.get(row.channel_id);
      if (ch) await ch.delete().catch(() => {});
    }

    // ✅ DB 기록 삭제
    await pool.query(`DELETE FROM session_call_channels WHERE session_id = ?`, [sessionId]);

    await updateSessionEmbed(session, client);

    return interaction.editReply(`✅ Session #${sessionId} closed. All call channels removed.`);
  }
};
