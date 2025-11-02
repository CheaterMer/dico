import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { pool } from '../../config/db.js';

export default {
  customId: 'session_select',

  async execute(interaction) {
    const sessionId = interaction.values[0];

    const [[session]] = await pool.query(
      `SELECT * FROM test_sessions WHERE session_id = ?`,
      [sessionId]
    );

    if (!session) return interaction.reply({ content: '❌ Session not found.', ephemeral: true });

    const testers = JSON.parse(session.testers || '[]');
    const participants = JSON.parse(session.participants || '[]');

    const statusText = session.status === 'OPEN'
      ? (session.is_recruiting ? '🟢 Recruiting' : '🟠 Open (Not Recruiting)')
      : '🔴 Closed';

    const embed = new EmbedBuilder()
      .setTitle(`📋 Session #${sessionId}`)
      .setColor('#00BFFF')
      .addFields(
        { name: 'Region', value: session.region, inline: true },
        { name: 'Status', value: statusText, inline: true },
        { name: 'Host', value: session.hoster_tag || 'Unknown', inline: false },
        { name: `Examiners (${testers.length})`, value: testers.map(id => `<@${id}>`).join('\n') || 'None', inline: false },
        { name: `Participants (${participants.length})`, value: participants.map((id, i) => `${i+1}. <@${id}>`).join('\n') || 'None', inline: false },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${sessionId}`)
        .setLabel('🛑 Close Session')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`reopen_${sessionId}`)
        .setLabel('✅ Reopen Session')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`delete_${sessionId}`)
        .setLabel('❌ Delete Session')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }
};
