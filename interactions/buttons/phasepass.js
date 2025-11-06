// interactions/buttons/phasepass.js
import { pool } from "../../config/db.js";
import { EmbedBuilder } from "discord.js";

export default {
  customIdStartsWith: "phasepass:",

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const requestId = interaction.customId.split(":")[1];

    const [[req]] = await pool.query(
      `SELECT player_id, guild_id, panel_channel_id FROM ht_requests WHERE id=?`,
      [requestId]
    );

    const player = await interaction.guild.members.fetch(req.player_id);

    // ✅ 승급 처리 (rank는 반드시 백틱으로 감싸기)
    const newRank = "LT2"; // ← 나중에 단계별 승급 계산 모듈 연결 가능
    await pool.query(`
      UPDATE members
      SET \`rank\`=?, lastPromotedAt=?
      WHERE guild_id=? AND user_id=?`,
      [newRank, Date.now(), req.guild_id, req.player_id]
    );

    // ✅ 요청 완료 상태로 변경
    await pool.query(`UPDATE ht_requests SET status='PASSED' WHERE id=?`, [requestId]);

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Test Passed`)
      .setColor("#7AFF8F")
      .setThumbnail(player.user.displayAvatarURL({ extension: "png", size: 256 }))
      .setDescription(`**<@${req.player_id}> has passed!**\nRank promoted to **${newRank}**.`)
      .setTimestamp();

    // ✅ 패널 채널에 알림
    const panelChannel = interaction.guild.channels.cache.get(req.panel_channel_id);
    if (panelChannel) panelChannel.send({ embeds: [embed] }).catch(() => {});

    // ✅ 로그 채널에도 전송
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
  
    return interaction.editReply("✅ Pass 처리 완료.");
  }
};
