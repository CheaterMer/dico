import { pool } from "../../config/db.js";
import { createFailureEmbed } from "../../utils/highTestUtils.js";

const HIGH_TESTER_ROLE = "1408415932660846673";

export default {
  customIdStartsWith: "phaseterrible:",

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const guild = interaction.guild;
    const executor = await guild.members.fetch(interaction.user.id);

    if (!executor.roles.cache.has(HIGH_TESTER_ROLE)) {
      return interaction.editReply("🚫 You must be a **High Tester**");
    }

    const requestId = interaction.customId.split(":")[1];
    const guildId = interaction.guild.id;
    const testerId = interaction.user.id;

    // 요청 데이터
    const [[req]] = await pool.query(
      `SELECT player_id FROM ht_requests WHERE id=?`,
      [requestId]
    );

    const player = await interaction.guild.members.fetch(req.player_id);

    // ✅ 로그 INSERT (terrible=1)
    await pool.query(
      `INSERT INTO ht_losses (guild_id, player_id, recorded_by, reason, terrible)
       VALUES (?, ?, ?, ?, 1)`,
      [guildId, req.player_id, testerId, "TERRIBLE performance. (Reason to be added later)"]
    );

    // ✅ 테스트 상태 종료
    await pool.query(`UPDATE ht_requests SET status='FAILED' WHERE id=?`, [requestId]);

    // ✅ Failure Embed
    const embed = createFailureEmbed(
      player,
      interaction.member,
      "TERRIBLE performance detected.",true
    );

    await interaction.editReply({ embeds: [embed] });

    try { await interaction.message.delete(); } catch {}

    // ✅ 시험 요청 채널 삭제
    const [[req2]] = await pool.query(
      `SELECT request_channel_id FROM ht_requests WHERE id=?`,
      [requestId]
    );

    if (req2?.request_channel_id) {
      const testChannel = interaction.guild.channels.cache.get(req2.request_channel_id);
      if (testChannel) testChannel.delete().catch(() => {});
    }

    await interaction.channel.send("💀 **TERRIBLE — Test terminated.**");
  }
};
