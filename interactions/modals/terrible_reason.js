// interactions/modals/terrible_reason.js
import { pool } from "../../config/db.js";
import { EmbedBuilder } from "discord.js";

const LOG_CHANNEL = "1435659710907945081"; // ✅ 테러블 로그 채널 설정

export default {
  customIdStartsWith: "terrible_reason:",

  async execute(interaction) {
    const requestId = interaction.customId.split(":")[1];
    const reason = interaction.fields.getTextInputValue("reason");
    const guildId = interaction.guild.id;

    // 요청 정보 가져오기
    const [[req]] = await pool.query(`
      SELECT player_id, target_tier, phase
      FROM ht_requests WHERE id=?
    `, [requestId]);

    // DB 기록
    await pool.query(`
      INSERT INTO ht_losses (guild_id, player_id, recorded_by, reason, terrible)
      VALUES (?, ?, ?, ?, 1)
    `, [guildId, req.player_id, interaction.user.id, reason]);

    // 상태 종료
    await pool.query(`UPDATE ht_requests SET status='FAILED' WHERE id=?`, [requestId]);

    // 로그 전송
    const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("💀 TERRIBLE Result Logged")
        .setColor("#ff4444")
        .addFields(
          { name: "Player", value: `<@${req.player_id}>`, inline: true },
          { name: "Recorded By", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Phase Failed", value: `Phase ${req.phase}`, inline: false },
          { name: "Rank Tested", value: req.target_tier || "Unknown", inline: false },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }

    await interaction.reply({ content: `💀 TERRIBLE 처리 완료\n사유 기록됨.`, ephemeral: true });
  }
};
