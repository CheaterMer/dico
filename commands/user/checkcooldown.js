// commands/user/checkcooldown.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { ensureMemberData } from "../../utils/commonUtils.js";

const allowedRanks = [
  '1408395786131079221', // HT1
  '1408395784264749117', // LT1
  '1408395781991567512', // HT2
  '1408395779378384980', // LT2
  '1408395776920387606', // HT3
];

export default {
  data: new SlashCommandBuilder()
    .setName("checkcooldown")
    .setDescription("Check if a user is eligible for the next rank test.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("Select a user (optional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const target = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guild.id;
    const member = await interaction.guild.members.fetch(target.id);
    const memberData = await ensureMemberData(guildId, target.id);

    const hasEligibleRank = member.roles.cache.some(r => allowedRanks.includes(r.id));
    const last = memberData.lastPromotedAt;
    const now = Date.now();
    const DAY = 86400000;
    const COOL = 30 * DAY;

    let statusIcon, color, statusText, footerText;

    if (!hasEligibleRank) {
      statusIcon = "⛔";
      color = "#ff4747";
      statusText =
        "**Rank Requirement Not Met**\n" +
        "> Required Ranks: **HT1 / LT1 / HT2 / LT2 / HT3**";
      footerText = "This user does not have test eligibility.";
    }
    else if (!last) {
      statusIcon = "🟢";
      color = "#4dffb8";
      statusText =
        "**Eligible for First Test**\n" +
        "> No previous rank promotion found.";
      footerText = "This user can test immediately.";
    }
    else {
      const elapsed = now - last;
      const passed = Math.floor(elapsed / DAY);

      if (elapsed >= COOL) {
        statusIcon = "✅";
        color = "#66ff99";
        statusText =
          `**Eligible to Test**\n` +
          `> Last promotion was **${passed} day(s)** ago.`;
        footerText = "Cooldown complete.";
      } else {
        const remaining = Math.ceil((COOL - elapsed) / DAY);
        statusIcon = "⏳";
        color = "#ffda6a";
        statusText =
          `**Not Eligible Yet**\n` +
          `> **${remaining} day(s)** remaining.\n` +
          `> Last promotion: **${passed} day(s)** ago.`;
        footerText = "User must wait until cooldown expires.";
      }
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Rank Cooldown Checker", iconURL: target.displayAvatarURL() })
      .setThumbnail(target.displayAvatarURL({ extension: "png", size: 256 }))
      .setColor(color)
      .setDescription(`${statusIcon} | <@${target.id}>`)
      .addFields(
        { name: "Rank", value: `\`${memberData.rank || "UnRanked"}\``, inline: true },
        { name: "Status", value: statusText, inline: false }
      )
      .setFooter({ text: footerText })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
