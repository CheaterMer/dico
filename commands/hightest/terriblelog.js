import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";

export default {
  data: new SlashCommandBuilder()
    .setName("terriblelog")
    .setDescription("View a player's TERRIBLE test history.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User to check")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    const [rows] = await pool.query(`
      SELECT reason, created_at
      FROM ht_losses
      WHERE guild_id=? AND player_id=? AND terrible=1
      ORDER BY created_at DESC
    `, [guildId, user.id]);

    if (!rows.length) {
      return interaction.editReply(`✅ <@${user.id}> has **no TERRIBLE** test records.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`💀 TERRIBLE Records — ${user.username}`)
      .setColor("#ff3b3b")
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setDescription(
        rows.map((r, i) =>
          `**${i + 1}.** *${new Date(r.created_at).toLocaleString()}*\n> **Reason:** ${r.reason || "Not provided"}`
        ).join("\n\n")
      )
      .setFooter({ text: "High Test System — TERRIBLE Log" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
