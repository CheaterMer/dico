// interactions/menus/setroles_menu.js
import { pool } from "../../config/db.js";
import { EmbedBuilder } from "discord.js";

const HIGH_TESTER_ROLE = "1408415932660846673";

export default {
  customId: "setroles_menu",

  async execute(interaction) {
    // customId 형식: setroles_menu:<requestId>
    const [base, requestId] = interaction.customId.split(":");
    const guild = interaction.guild;
    const executor = await guild.members.fetch(interaction.user.id);

    if (!executor.roles.cache.has(HIGH_TESTER_ROLE)) {
      return interaction.reply({ content: `🚫 Only <&${HIGH_TESTER_ROLE}> can modify allowed roles.`, ephemeral: true });
    }

    const selectedRoleIds = interaction.values; // 선택된 roleId 리스트 (문자열 배열)

    // 요청 로드
    const [[req]] = await pool.query(`
      SELECT player_id, required_opponents, opponents, panel_message_id, panel_channel_id
      FROM ht_requests
      WHERE id=? AND guild_id=? AND status='OPEN'
    `, [requestId, guild.id]);

    if (!req) {
      return interaction.reply({ content: "❌ This test request is not open or no longer exists.", ephemeral: true });
    }

    // DB 저장
    await pool.query(`
      UPDATE ht_requests SET allowed_roles=? WHERE id=?
    `, [JSON.stringify(selectedRoleIds), requestId]);

    // 패널 임베드 갱신
    const channel = await guild.channels.fetch(req.panel_channel_id).catch(() => null);
    if (!channel) return interaction.reply({ content: "⚠️ Panel channel not found.", ephemeral: true });

    const message = await channel.messages.fetch(req.panel_message_id).catch(() => null);
    if (!message) return interaction.reply({ content: "⚠️ Panel message not found.", ephemeral: true });

    const opponents = JSON.parse(req.opponents || "[]");
    const required = req.required_opponents;

    const embed = EmbedBuilder.from(message.embeds[0] ?? {});
    const opponentList = opponents.length
      ? opponents.map((uid, i) => `${i + 1}) <@${uid}>`).join("\n")
      : "_None yet_";

    embed
      .setColor("#00bfff")
      .setTitle("🎯 High Test — Opponent Search")
      .setDescription([
        `**Player:** <@${req.player_id}>`,
        `**Required Opponents:** \`${required}\` **Current:** \`${opponents.length}/${required}\``,
        ``,
        `**Current Opponents:**`,
        opponentList,
        ``,
        `**Allowed Roles:**`,
        selectedRoleIds.map(r => `<@&${r}>`).join(", "),
        ``,
        `Click **Volunteer** to join if you have one of the allowed roles.`
      ].join("\n"))
      .setTimestamp();

    await message.edit({ embeds: [embed] });

    return interaction.reply({
      content: `✅ Allowed roles updated: ${selectedRoleIds.map(r => `<@&${r}>`).join(", ")}`,
      ephemeral: true
    });
  }
};
