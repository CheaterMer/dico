import { pool } from "../../config/db.js";

export default {
  customIdStartsWith: "phasefail:",

  async execute(interaction) {
    const requestId = interaction.customId.split(":")[1];
    const guild = interaction.guild;

    // 요청 정보 가져오기
    const [[req]] = await pool.query(`
      SELECT guild_id, player_id, panel_channel_id
      FROM ht_requests WHERE id=?`,
      [requestId]
    );

    if (!req) {
      return interaction.reply({ content: "⚠️ Test request not found.", ephemeral: true });
    }

    // 실패 기록 저장
    await pool.query(`
      INSERT INTO ht_losses (guild_id, player_id, recorded_by, reason, terrible)
      VALUES (?, ?, ?, 'Standard Test Failure', 0)
    `, [req.guild_id, req.player_id, interaction.user.id]);

    // 상태 종료
    await pool.query(`
      UPDATE ht_requests SET status='FAILED'
      WHERE id=?
    `, [requestId]);

    // 패널 정리
    const channel = await guild.channels.fetch(req.panel_channel_id);
    const msg = await channel.messages.fetch(channel.lastMessageId);

    await msg.edit({
      content: `❌ **FAIL** — <@${req.player_id}> did not pass the test.`,
      components: []
    });

    return interaction.reply({ content: "❌ Failure recorded. Test closed.", ephemeral: true });
  }
};
