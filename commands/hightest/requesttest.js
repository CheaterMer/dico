// commands/hightest/requesttest.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { pool } from "../../config/db.js";

const HT1 = "1408395786131079221";
const LT1 = "1408395784264749117";
const HT2 = "1408395781991567512";
const LT2 = "1408395779378384980";
const HT3 = "1408395776920387606";
const LT3 = "1435534714982105148";

const HIGH_TESTER_ROLE = "1408415932660846673";
const LOG_CHANNEL = "1433141180371304448";
const REQUEST_CATEGORY = "1408403041702641714"; // 시험 요청 카테고리 ✅

const allowed = [HT3, LT2, HT2, LT1];
const blocked = [HT1, LT3];

export default {
  data: new SlashCommandBuilder()
    .setName("requesttest")
    .setDescription("This message notifies the staff that I am ready for the test."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const userId = interaction.user.id;
    const member = await guild.members.fetch(userId);

    if (blocked.some(id => member.roles.cache.has(id))) {
      return interaction.editReply("🚫 This rank is not eligible to request a test.");
    }

    if (!allowed.some(id => member.roles.cache.has(id))) {
      return interaction.editReply("⏳ You are not yet eligible to take the test.");
    }

    const [[row]] = await pool.query(`
      SELECT lastPromotedAt FROM members
      WHERE guild_id=? AND user_id=?`, [guild.id, userId]);

    const [[settings]] = await pool.query(`
      SELECT ht_request_expiry_days FROM guild_settings
      WHERE guild_id=?`, [guild.id]);

    const expiry = settings?.ht_request_expiry_days ?? 14;
    const now = Date.now();
    const last = row?.lastPromotedAt ?? 0;
    const remaining = expiry - Math.floor((now - last) / 86400000);

    //if (remaining > 0) {
    //  return interaction.editReply(`⏳ 시험 요청까지 **${remaining}일** 남았습니다.`);
    //}

    const [result] = await pool.query(`
      INSERT INTO ht_requests (guild_id, player_id, target_tier, created_by, expiry_at)
      VALUES (?, ?, NULL, ?, ?)`,
      [guild.id, userId, userId, now + expiry * 86400000]
    );
    const requestId = result.insertId;

    const baseName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
    const channelName = `req-${baseName}-${requestId}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: REQUEST_CATEGORY,
      permissionOverwrites: [
        { id: guild.id, deny: ["ViewChannel"] },
        { id: userId, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
        { id: HIGH_TESTER_ROLE, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] }
      ]
    });

    // ✅ 새로 만든 시험 채널을 DB에 저장
    await pool.query(`UPDATE ht_requests SET request_channel_id=? WHERE id=?`, [channel.id, requestId]);


    // ✅ ✅ ✅ ***핵심 추가: 채널에 playerId 저장***
    await channel.setTopic(userId);

    await channel.send({
      content:
        `📢 <@${userId}> is **ready for their High Test.**\n` +
        `<${HIGH_TESTER_ROLE}> Please review and use \`/openlf\` **in this channel**.`
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#00bfff")
          .setDescription(`✅ Your test request has been submitted.\nA private test channel has been created: <#${channel.id}>`)
      ]
    });
  }
};
