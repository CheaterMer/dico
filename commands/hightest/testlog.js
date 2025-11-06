import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";

export default {
  data: new SlashCommandBuilder()
    .setName("testlog")
    .setDescription("View a player's complete High Test history.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User to check")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    const [tests] = await pool.query(`
      SELECT status, created_at
      FROM ht_requests
      WHERE guild_id=? AND player_id=?
      ORDER BY created_at DESC
    `, [guildId, user.id]);

    const [terrible] = await pool.query(`
      SELECT reason, created_at
      FROM ht_losses
      WHERE guild_id=? AND player_id=? AND terrible=1
      ORDER BY created_at DESC
    `, [guildId, user.id]);

    if (!tests.length && !terrible.length) {
      return interaction.editReply(`✅ <@${user.id}> has **no test history**.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📜 Test History — ${user.username}`)
      .setColor("#00bfff")
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "Standard Results",
          value: tests.length
            ? tests.map((t, i) =>
              `**${i + 1}.** \`${t.status}\` — *${new Date(t.created_at).toLocaleString()}*`
            ).join("\n")
            : "_None_",
          inline: false
        },
        {
          name: "💀 TERRIBLE Results",
          value: terrible.length
            ? terrible.map((t, i) =>
              `**${i + 1}.** *${new Date(t.created_at).toLocaleString()}*\n> Reason: ${t.reason || "Not provided"}`
            ).join("\n\n")
            : "_None_",
          inline: false
        }
      )
      .setFooter({ text: "High Test System — Log Viewer" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
