// commands/admin/cooldown.js
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { pool } from "../../config/db.js";
import dotenv from "dotenv";
dotenv.config();

const HIGH_TESTER_ROLE = "1408415932660846673";

export default {
  data: new SlashCommandBuilder()
    .setName("cooldown")
    .setDescription("Manage test cooldown for a user.")
    .addUserOption(opt =>
      opt.setName("user").setDescription("User to modify").setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("reason")
        .setDescription("Reason for changing cooldown")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("action")
        .setDescription("Cooldown action")
        .setRequired(true)
        .addChoices(
          { name: "Remove Cooldown", value: "remove" },
          { name: "Reduce Days", value: "reduce" },
          { name: "Set Days Remaining", value: "set" }
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName("days")
        .setDescription("Days to reduce / set (if applicable)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const executor = await interaction.guild.members.fetch(interaction.user.id);

    // ✅ Permission: OWNER or HIGH TESTER
    if (
      interaction.user.id !== process.env.OWNER_ID &&
      !executor.roles.cache.has(HIGH_TESTER_ROLE)
    ) {
      return interaction.editReply({
        content: `🚫 You must be a <@&${HIGH_TESTER_ROLE}> to use this command.`,
      });
    }

    const target = interaction.options.getUser("user");
    const action = interaction.options.getString("action");
    const days = interaction.options.getInteger("days") ?? 0;
    const reason = interaction.options.getString("reason") ?? "No reason provided.";
    const guildId = interaction.guild.id;

    // ✅ Ensure DB record exists
    await pool.query(
      `INSERT IGNORE INTO members (guild_id, user_id, \`rank\`, status)
       VALUES (?, ?, 'UnRanked', 'Active')`,
      [guildId, target.id]
    );

    // ✅ Load current cooldown timestamp
    const [[data]] = await pool.query(
      `SELECT lastPromotedAt FROM members WHERE guild_id=? AND user_id=?`,
      [guildId, target.id]
    );

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const THIRTY = 30;

    let last = data?.lastPromotedAt ?? now;
    const beforeRemaining = Math.max(0, THIRTY - Math.floor((now - last) / DAY));

    // ✅ Apply Action
    if (action === "remove") last = now - (THIRTY * DAY);
    else if (action === "reduce") last = last - (days * DAY);
    else if (action === "set") last = now - ((THIRTY - days) * DAY);

    // ✅ Save
    await pool.query(
      `UPDATE members SET lastPromotedAt=? WHERE guild_id=? AND user_id=?`,
      [last, guildId, target.id]
    );

    const afterRemaining = Math.max(0, THIRTY - Math.floor((now - last) / DAY));
    const nextEligibleTs = Math.floor((last + THIRTY * DAY) / 1000);

    const isEligible = afterRemaining === 0;
    const statusIcon = isEligible ? "✅" : "⏳";
    const color = isEligible ? "#66ff99" : "#ffda6a";

    const actionLabel = {
      remove: "Remove Cooldown",
      reduce: `Reduce Days (${days})`,
      set: `Set Days Remaining (${days})`
    }[action];

    // ✅ Embed Output
    const embed = new EmbedBuilder()
      .setAuthor({ name: "Cooldown Manager", iconURL: target.displayAvatarURL() })
      .setThumbnail(target.displayAvatarURL({ extension: "png", size: 256 }))
      .setColor(color)
      .setDescription(`${statusIcon} | <@${target.id}>`)
      .addFields(
        { name: "Action", value: `**${actionLabel}**`, inline: true },
        { name: "Before → After", value: `\`${beforeRemaining}d\` → \`${afterRemaining}d\``, inline: true },
        { name: "Next Eligible", value: isEligible ? "**Now**" : `<t:${nextEligibleTs}:D> (<t:${nextEligibleTs}:R>)`, inline: true },
        { name: "👤 Executed By", value: `<@${interaction.user.id}>`, inline: false },
        { name: "📝 Reason", value: reason, inline: false } // ✅ NEW
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
