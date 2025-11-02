import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../../config/db.js';
import { getSessionById, isExaminer, updateSessionEmbed } from '../../utils/sessionUtils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('closesession')
    .setDescription('❌ Force-close a session (emergency).')
    .addIntegerOption(opt =>
      opt.setName('id')
        .setDescription('Session ID')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const sessionId = interaction.options.getInteger('id');
    const session = await getSessionById(sessionId);
    if (!session) return interaction.editReply(`❌ Session **#${sessionId}** not found.`);

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!await isExaminer(member, sessionId)) {
      return interaction.editReply('🚫 Only examiners / owner can force close this session.');
    }

    // ✅ 세션 종료 처리
    await pool.query(
      `UPDATE test_sessions SET status = 'CLOSED', is_recruiting = 0 WHERE session_id = ?`,
      [sessionId]
    );

    // ✅ 호출 채널 싹 삭제
    const [rows] = await pool.query(
      `SELECT channel_id FROM session_call_channels WHERE session_id = ?`,
      [sessionId]
    );

    for (const row of rows) {
      const ch = interaction.guild.channels.cache.get(row.channel_id);
      if (ch) await ch.delete().catch(() => {});
    }

    // ✅ 로그 삭제
    await pool.query(`DELETE FROM session_call_channels WHERE session_id = ?`, [sessionId]);

    // ✅ UI 업데이트
    await updateSessionEmbed(session, client);

    return interaction.editReply(`🛑 Session **#${sessionId}** has been **forcefully closed**. (All temp channels removed)`);
  }
};
