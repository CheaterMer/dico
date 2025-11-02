// commands/user/rank.js
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ensureMemberData, logInteraction, getGuildBloxlinkKey } from '../../utils/commonUtils.js';
import { discordToRobloxId, getRobloxThumbnail } from '../../utils/robloxUtils.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("View a user's Rank Card.")
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to check')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    const memberData = await ensureMemberData(guildId, targetUser.id);

    const apiKey = await getGuildBloxlinkKey(guildId);
    const robloxId = await discordToRobloxId(targetUser.id, apiKey, guildId);
    const avatarURL = robloxId ? await getRobloxThumbnail(robloxId) : targetUser.displayAvatarURL({ dynamic: true });

    const robloxProfile = robloxId
      ? `[View Profile](https://www.roblox.com/users/${robloxId}/profile)`
      : '❌ Not Linked';

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Rank Card`)
      .setThumbnail(avatarURL)
      .addFields(
        { name: 'Rank', value: memberData.rank || 'None', inline: true },
        { name: 'Clan', value: memberData.clan || 'None', inline: true },
        { name: 'Roblox Profile', value: robloxProfile, inline: true }
      )
      .setColor('#ff9900')
      .setFooter({ text: 'HT System | Rank Card' })
      .setTimestamp();

    await logInteraction(interaction, { Action: '/rank', Target: targetUser.id });

    await interaction.reply({ embeds: [embed] });
  }
};
