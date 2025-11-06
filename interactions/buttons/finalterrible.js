import { pool } from "../../config/db.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  customIdStartsWith: "finalterrible:",

  async execute(interaction) {
    const requestId = interaction.customId.split(":")[1];
    const guild = interaction.guild;
    const executor = interaction.member;

    const [[req]] = await pool.query(`
      SELECT guild_id, player_id, panel_channel_id
      FROM ht_requests WHERE id=?`,
      [requestId]
    );

    if (!req) {
      return interaction.reply({ content: "⚠️ Test request not found.", ephemeral: true });
    }

    // ✅ TERRIBLE Failure 기록
    await pool.query(`
      INSERT INTO ht_losses (guild_id, player_id, recorded_by, reason, terrible)
      VALUES (?, ?, ?, 'Terrible Performance', 1)
    `, [req.guild_id, req.player_id, executor.id]);

    // ✅ 테스트 상태 종료
    await pool.query(`
      UPDATE ht_requests
      SET status='FAILED'
      WHERE id=?
    `, [requestId]);

    // ✅ 패널 UI 업데이트
    const channel = await guild.channels.fetch(req.panel_channel_id);
    const msg = await channel.messages.fetch(channel.lastMessageId);

    await msg.edit({
      content: `💀 **TERRIBLE PERFORMANCE** — <@${req.player_id}> has failed the test with severe performance issues.`,
      components: []
    });

    // ✅ DM notify (optional)
    try {
      const user = await guild.members.fetch(req.player_id);
      await user.send("💀 Your High Test result: **TERRIBLE**.\nPlease practice further before reattempting.");
    } catch {}

    return interaction.reply({ content: "☠️ Terrible failure recorded and test ended.", ephemeral: true });
  }
};
