import { pool } from '../../config/db.js';

export default {
  customIdPrefix: 'reopen_',

  async execute(interaction) {
    const sessionId = interaction.customId.split('_')[1];

    await pool.query(
      `UPDATE test_sessions SET status='OPEN', is_recruiting=1 WHERE session_id=?`,
      [sessionId]
    );

    await interaction.reply({ content: `✅ Session #${sessionId} reopened.`, ephemeral: true });
  }
};
