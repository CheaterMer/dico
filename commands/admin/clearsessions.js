import { SlashCommandBuilder } from 'discord.js';
import { pool } from '../../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

export default {
  data: new SlashCommandBuilder()
    .setName('clearsessions')
    .setDescription('⚠ Delete ALL test sessions from the database (Owner Only).'),

  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ Owner only command.', flags: 64 });
    }

    await interaction.reply({ content: '⏳ Deleting all sessions...', flags: 64 });

    await pool.query(`DELETE FROM session_testers`);
    await pool.query(`DELETE FROM session_participants`);
    await pool.query(`DELETE FROM session_history`);
    await pool.query(`DELETE FROM test_sessions`);

    // ✅ 세션 번호 초기화
    await pool.query(`ALTER TABLE test_sessions AUTO_INCREMENT = 1`);

    return interaction.editReply('✅ All sessions cleared & numbering reset to **#1**.');
  }
};
