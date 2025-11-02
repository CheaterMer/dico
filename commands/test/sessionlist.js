import { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { pool } from '../../config/db.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sessionlist')
    .setDescription('Manage test sessions via dropdown menu.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;

    const [sessions] = await pool.query(`
      SELECT session_id, region, hoster_tag, status, is_recruiting
      FROM test_sessions
      WHERE guild_id = ?
      ORDER BY created_at DESC
    `, [guildId]);

    if (!sessions.length)
      return interaction.editReply('❌ No sessions found.');

    const menu = new StringSelectMenuBuilder()
      .setCustomId('session_select')
      .setPlaceholder('Select a session to manage...')
      .addOptions(
        sessions.map(s => ({
          label: `#${s.session_id} — ${s.region}`,
          description: `${s.hoster_tag} — ${s.status}${s.is_recruiting ? ' (Recruiting)' : ''}`,
          value: String(s.session_id)
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setTitle('📋 Select a Session')
      .setDescription('Choose a session below to view and manage it.')
      .setColor('#00BFFF');

    interaction.editReply({ embeds: [embed], components: [row] });
  }
};
