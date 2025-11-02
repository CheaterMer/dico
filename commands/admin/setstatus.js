// commands/admin/setstatus.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { ensureMemberData, logInteraction } from '../../utils/commonUtils.js';
import { pool } from '../../config/db.js';
import { examinerRoles } from "../../config/rolemap.js";
import dotenv from 'dotenv';
dotenv.config();

export default {
  data: new SlashCommandBuilder()
    .setName('setstatus')
    .setDescription("Change a member's status (Active, Retired, LOA)")
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('User to update')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('New status')
        .setRequired(true)
        .addChoices(
          { name: 'Active', value: 'Active' },
          { name: 'Retired', value: 'Retired' },
          { name: 'LOA', value: 'LOA' }
        )
    ),

  async execute(interaction) {
    // ✅ 먼저 응답 지연
    await interaction.deferReply({ flags: 64 });

    const target = interaction.options.getUser('user');
    const newStatus = interaction.options.getString('status');
    const guildId = interaction.guild.id;

    const memberData = await ensureMemberData(guildId, target.id);
    const oldStatus = memberData.status;

    // ✅ 명령 실행자 정보 가져오기
    const executor = await interaction.guild.members.fetch(interaction.user.id);

    // ✅ 서버 owner → 바로 허용
    if (interaction.user.id !== process.env.OWNER_ID) {
      const allowed = executor.roles.cache.some(r => examinerRoles.includes(r.id));
      if (!allowed) {
        return interaction.editReply("🚫 You don't have permission to use this command.");
      }
    }

    // ✅ DB 업데이트
    await pool.query(
      `UPDATE members SET status = ? WHERE guild_id = ? AND user_id = ?`,
      [newStatus, guildId, target.id]
    );

    // ✅ Embed 구성
    const embed = new EmbedBuilder()
      .setTitle('✅ Member Status Updated')
      .setColor('#00ff99')
      .addFields(
        { name: 'User', value: `${target}`, inline: false },
        { name: 'Previous Status', value: oldStatus, inline: true },
        { name: 'New Status', value: newStatus, inline: true },
      )
      .setFooter({ text: `Updated by ${interaction.user.tag}` })
      .setTimestamp();

    // ✅ 로깅
    await logInteraction(interaction, {
      Action: '/setstatus',
      Target: target.id,
      OldStatus: oldStatus,
      NewStatus: newStatus
    });

    return interaction.editReply({ embeds: [embed] });
  }
};
