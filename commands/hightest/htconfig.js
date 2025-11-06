// commands/hightest/htconfig.js
import { SlashCommandBuilder } from "discord.js";
import { pool } from "../../config/db.js";

const HIGH_TESTER_ROLE = "1408415932660846673";

export default {
  data: new SlashCommandBuilder()
    .setName("htconfig")
    .setDescription("Configure High Test system settings.")
    .addSubcommand(sc =>
      sc.setName("setexpiry")
        .setDescription("Set number of days before HT requests expire.")
        .addIntegerOption(o =>
          o.setName("days")
            .setDescription("Number of days (7-60 recommended)")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const executor = await interaction.guild.members.fetch(interaction.user.id);

    // ✅ Permission
    if (
      interaction.user.id !== process.env.OWNER_ID &&
      !executor.roles.cache.has(HIGH_TESTER_ROLE)
    ) {
      return interaction.editReply(`🚫 Only <@&${HIGH_TESTER_ROLE}> can use this command.`);
    }

    const days = interaction.options.getInteger("days");
    const guildId = interaction.guild.id;

    await pool.query(
      `INSERT INTO guild_settings (guild_id, ht_request_expiry_days)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE ht_request_expiry_days=?`,
      [guildId, days, days]
    );

    return interaction.editReply(`✅ HT request expiry updated to **${days} days**.`);
  }
};
