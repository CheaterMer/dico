// commands/user/id.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureMemberData, logInteraction, getGuildBloxlinkKey } from '../../utils/commonUtils.js';
import { discordToRobloxId } from '../../utils/robloxUtils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('id')
    .setDescription("Check a user's ID card.")
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to check')
        .setRequired(false)
    ),

  async execute(interaction) {
    // ✅ Always defer as FIRST action
    await interaction.deferReply({ ephemeral: false });

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    const memberData = await ensureMemberData(guildId, targetUser.id);
    const apiKey = await getGuildBloxlinkKey(guildId);
    const robloxId = await discordToRobloxId(targetUser.id, apiKey, guildId);

    const robloxLink = robloxId
      ? `[Roblox Profile](https://www.roblox.com/users/${robloxId}/profile)`
      : '❌ Not Linked';

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s ID Card`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Discord', value: `${targetUser.tag}`, inline: true },
        { name: 'Roblox', value: robloxLink, inline: true },
        { name: 'Rank', value: memberData.rank || 'None', inline: true },
        { name: 'Clan', value: memberData.clan || 'None', inline: true },
        { name: 'Status', value: memberData.status || 'Active', inline: true }
      )
      .setColor('#00b0f4')
      .setFooter({ text: 'HT System | ID Card' })
      .setTimestamp();

    await logInteraction(interaction, { Action: '/id', Target: targetUser.id });

    // ✅ Reply safely
    return interaction.editReply({ embeds: [embed] });
  }
};
