import { pool } from '../../config/db.js';

export default {
  customIdPrefix: 'close_',

  async execute(interaction) {
    const sessionId = interaction.customId.split('_')[1];

    await pool.query(
      `UPDATE test_sessions SET status='CLOSED', is_recruiting=0 WHERE session_id=?`,
      [sessionId]
    );

    await interaction.reply({ content: `🛑 Session #${sessionId} closed.`, ephemeral: true });
  }
};
