import { EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";

const RESULT_CHANNEL = "1429811605444497479";

// 승급 체인 (자동 계산)
const PROMOTION_CHAIN = [
  ["1408395776920387606", "1408395779378384980"], // HT3 -> LT2
  ["1408395779378384980", "1408395781991567512"], // LT2 -> HT2
  ["1408395781991567512", "1408395784264749117"], // HT2 -> LT1
  ["1408395784264749117", "1408395786131079221"], // LT1 -> HT1
];

export default {
  customIdStartsWith: "htpass:",

  async execute(interaction, client) {
    const [, requestId] = interaction.customId.split(":");
    const guild = interaction.guild;
    const executor = interaction.user;

    await interaction.deferReply({ ephemeral: true });

    // Load request
    const [[request]] = await pool.query(`
      SELECT player_id, panel_channel_id FROM ht_requests
      WHERE id=? AND guild_id=? AND status='OPEN'
    `, [requestId, guild.id]);

    if (!request) return interaction.editReply("⚠️ This test request is no longer active.");

    const playerId = request.player_id;
    const player = await guild.members.fetch(playerId).catch(() => null);
    if (!player) return interaction.editReply("⚠️ Player not found.");

    // Determine current + next tier
    let oldRole = null, newRole = null;

    for (const [cur, next] of PROMOTION_CHAIN) {
      if (player.roles.cache.has(cur)) {
        oldRole = cur;
        newRole = next;
        break;
      }
    }

    if (!oldRole || !newRole) {
      return interaction.editReply("❌ This player cannot be promoted (already highest tier or invalid).");
    }

    // Apply role change
    await player.roles.remove(oldRole).catch(() => {});
    await player.roles.add(newRole).catch(() => {});

    // Update cooldown (mark promotion time)
    await pool.query(`
      UPDATE members SET lastPromotedAt=? WHERE guild_id=? AND user_id=?
    `, [Date.now(), guild.id, playerId]);

    // Close request
    await pool.query(`UPDATE ht_requests SET status='CLOSED' WHERE id=?`, [requestId]);

    // Send log embed
    const logChannel = await guild.channels.fetch(RESULT_CHANNEL).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("#6BFF8A")
        .setTitle("✅ High Test — PASS")
        .setDescription([
          `**Player:** <@${playerId}>`,
          `**Promoted:** <@&${oldRole}> → <@&${newRole}>`,
          ``,
          `👤 **Judge:** <@${executor.id}>`
        ].join("\n"))
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }

    // Delete test channel
    const testChannel = await guild.channels.fetch(request.panel_channel_id).catch(() => null);
    if (testChannel) testChannel.delete().catch(() => {});

    return interaction.editReply("✅ PASS recorded and channel closed.");
  }
};
