import { pool } from '../../config/db.js';

export default {
  customIdPrefix: 'delete_',

  async execute(interaction) {
    const sessionId = interaction.customId.split('_')[1];

    await pool.query(`DELETE FROM test_sessions WHERE session_id=?`, [sessionId]);

    await interaction.reply({ content: `❌ Session #${sessionId} deleted.`, ephemeral: true });
  }
};
