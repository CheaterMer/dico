import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../../config/db.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sessioninfo')
    .setDescription('Show detailed information about a specific test session.')
    .addIntegerOption(opt =>
      opt.setName('session_id')
        .setDescription('ID of the session to view')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: false });

    const sessionId = interaction.options.getInteger('session_id');

    const [[session]] = await pool.query(
      `SELECT * FROM test_sessions WHERE session_id = ?`,
      [sessionId]
    );

    if (!session) {
      return interaction.editReply('❌ Session not found.');
    }

    const testers = session.testers ? JSON.parse(session.testers) : [];
    const participants = session.participants ? JSON.parse(session.participants) : [];

    const statusText =
      session.status === 'OPEN' && session.is_recruiting
        ? '🟢 Recruiting'
        : session.status === 'STOPPED'
          ? '🟡 Stopped'
          : '🔴 Closed';

    const embed = new EmbedBuilder()
      .setTitle(`📋 Session #${sessionId}`)
      .setColor('#00BFFF')
      .addFields(
        { name: 'Region', value: session.region, inline: true },
        { name: 'Status', value: statusText, inline: true },
        { name: 'Private Server', value: session.link || 'N/A', inline: false },
        { name: 'Host', value: session.hoster_tag || 'Unknown', inline: false },
        {
          name: `Examiners (${testers.length})`,
          value: testers.length ? testers.map(id => `<@${id}>`).join('\n') : 'None',
          inline: false
        },
        {
          name: `Participants (${participants.length})`,
          value: participants.length ? participants.map((id, i) => `${i + 1}. <@${id}>`).join('\n') : 'None',
          inline: false
        }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
