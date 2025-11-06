import { pool } from "../../config/db.js";
import { rankRoleMap } from "../../config/rolemap.js";
import { promotionMap } from "../../config/rolemap.js"; // ensure this is exported
import { EmbedBuilder } from "discord.js";

export default {
  customIdStartsWith: "finalpass:",

  async execute(interaction) {
    const requestId = interaction.customId.split(":")[1];
    const guild = interaction.guild;

    // 🔍 요청 정보 가져오기
    const [[req]] = await pool.query(`
      SELECT guild_id, player_id, panel_channel_id
      FROM ht_requests WHERE id=?`,
      [requestId]
    );

    if (!req) return interaction.reply({ content: "⚠️ Test request not found.", ephemeral: true });

    const member = await guild.members.fetch(req.player_id).catch(() => null);
    if (!member) return interaction.reply({ content: "⚠️ Player is not in the server.", ephemeral: true });

    // 🎯 현재 티어 감지
    const currentTier = Object.keys(rankRoleMap).find(tier =>
      member.roles.cache.has(rankRoleMap[tier])
    );

    if (!currentTier) {
      return interaction.reply({ content: "⚠️ Player has no rank role.", ephemeral: true });
    }

    // 🎯 다음 티어 찾기
    const nextTier = promotionMap[currentTier];
    if (!nextTier) {
      return interaction.reply({ content: "🏆 Player is already in the highest tier (HT1).", ephemeral: true });
    }

    const currentRoleId = rankRoleMap[currentTier];
    const nextRoleId = rankRoleMap[nextTier];

    // 🏅 역할 변경 (승급)
    await member.roles.remove(currentRoleId).catch(() => {});
    await member.roles.add(nextRoleId).catch(() => {});

    // ✅ DB 상태 변경
    await pool.query(`UPDATE ht_requests SET status='PASSED' WHERE id=?`, [requestId]);
    await pool.query(`UPDATE members SET lastPromotedAt=? WHERE guild_id=? AND user_id=?`,
      [Date.now(), req.guild_id, req.player_id]
    );

    // 📌 패널 메시지 정리
    const channel = await guild.channels.fetch(req.panel_channel_id);
    const msg = await channel.messages.fetch(channel.lastMessageId);

    await msg.edit({
      content: `🏆 **PASS** — <@${req.player_id}> has been promoted to **${nextTier}**!`,
      components: []
    });

    return interaction.reply({ content: `✅ Successfully promoted to **${nextTier}**.`, ephemeral: true });
  }
};
