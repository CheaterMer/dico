import { EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";

const RESULT_CHANNEL = "1429811605444497479";

export default {
  customIdStartsWith: "htfail:",

  async execute(interaction, client) {
    const [, requestId] = interaction.customId.split(":");
    const guild = interaction.guild;
    const executor = interaction.user;

    await interaction.deferReply({ ephemeral: true });

    // ✅ Load request info
    const [[request]] = await pool.query(`
      SELECT player_id, panel_channel_id
      FROM ht_requests
      WHERE id=? AND guild_id=? AND status='OPEN'
    `, [requestId, guild.id]);

    if (!request) {
      return interaction.editReply("⚠️ This test request is no longer active or already closed.");
    }

    const playerId = request.player_id;
    const player = await guild.members.fetch(playerId).catch(() => null);

    if (!player) {
      return interaction.editReply("⚠️ Player not found in this server.");
    }

    // ✅ Record cooldown start
    await pool.query(`
      UPDATE members SET lastPromotedAt=? WHERE guild_id=? AND user_id=?
    `, [Date.now(), guild.id, playerId]);

    // ✅ Log a loss
    await pool.query(`
      INSERT INTO ht_losses (guild_id, player_id, recorded_by, reason)
      VALUES (?, ?, ?, ?)
    `, [guild.id, playerId, executor.id, "Failed the High Test"]);

    // ✅ Close request
    await pool.query(`
      UPDATE ht_requests SET status='CLOSED' WHERE id=?
    `, [requestId]);

    // ✅ Send log embed
    const logChannel = await guild.channels.fetch(RESULT_CHANNEL).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("#FF6B6B")
        .setTitle("❌ High Test — FAIL")
        .setDescription([
          `**Player:** <@${playerId}>`,
          `**Status:** Did not pass the test.`,
          ``,
          `👤 **Judge:** <@${executor.id}>`
        ].join("\n"))
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }

    // ✅ Delete test channel
    const testChannel = await guild.channels.fetch(request.panel_channel_id).catch(() => null);
    if (testChannel) await testChannel.delete().catch(() => {});

    return interaction.editReply("❌ FAIL recorded and channel closed.");
  }
};
