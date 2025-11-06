// interactions/buttons/phasefail.js
import { pool } from "../../config/db.js";
import { createFailureEmbed } from "../../utils/highTestUtils.js";

export default {
  customIdStartsWith: "phasefail:",

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const requestId = interaction.customId.split(":")[1];

    const [[req]] = await pool.query(
      `SELECT player_id, panel_channel_id, guild_id FROM ht_requests WHERE id=?`,
      [requestId]
    );

    const player = await interaction.guild.members.fetch(req.player_id);

    // ✅ DB 상태 변경
    await pool.query(`UPDATE ht_requests SET status='FAILED' WHERE id=?`, [requestId]);

    // ✅ 임베드 생성
    const embed = createFailureEmbed(player, interaction.member, "Player did not meet the required standard.");

    // ✅ 패널 채널에 안내
    const panelChannel = interaction.guild.channels.cache.get(req.panel_channel_id);
    if (panelChannel) panelChannel.send({ embeds: [embed] }).catch(() => {});

    // ✅ 로그 채널 전송
    const logChannel = interaction.guild.channels.cache.get(process.env.TEST_LOG_CHANNEL);
    if (logChannel) logChannel.send({ embeds: [embed] }).catch(() => {});

    try { await interaction.message.delete(); } catch {}

    // ✅ 시험 요청 채널 삭제
    const [[req2]] = await pool.query(
      `SELECT request_channel_id FROM ht_requests WHERE id=?`,
      [requestId]
    );

    if (req2?.request_channel_id) {
      const testChannel = interaction.guild.channels.cache.get(req2.request_channel_id);
      if (testChannel) testChannel.delete().catch(() => {});
    }

    await interaction.editReply("❌ 테스트 실패 처리 완료.");
  }
};
