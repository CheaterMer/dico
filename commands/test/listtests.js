// commands/test/listtests.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { pool } from "../../config/db.js";

export default {
  data: new SlashCommandBuilder()
    .setName("listtests")
    .setDescription("View all sessions and select one to manage."),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;

    const [sessions] = await pool.query(
      `SELECT session_id, region, status, is_recruiting, hoster_tag FROM test_sessions WHERE guild_id = ? ORDER BY created_at DESC`,
      [guildId]
    );

    if (!sessions.length) {
      return interaction.editReply({ content: "❌ No test sessions found." });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_session")
      .setPlaceholder("Select a session to manage")
      .addOptions(
        sessions.map(s => ({
          label: `Session #${s.session_id} — ${s.region}`,
          description: `Host: ${s.hoster_tag || "Unknown"}`,
          value: `${s.session_id}`
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setTitle("📋 Select a Session to Manage")
      .setColor("#00BFFF")
      .setDescription("Choose a session from the dropdown menu below.");

    await interaction.editReply({ embeds: [embed], components: [row] });
  }
};
