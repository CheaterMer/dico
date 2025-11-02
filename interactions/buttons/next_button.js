import { 
  getSessionIdFromCustomId, 
  getSessionById, 
  callNext, 
  updateSessionEmbed, 
  isExaminer, 
  getTesters 
} from "../../utils/sessionUtils.js";
import { pool } from "../../config/db.js";

export default {
  customIdStartsWith: "next_",

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const sessionId = getSessionIdFromCustomId(interaction.customId);
    const session = await getSessionById(sessionId);
    if (!session) return interaction.editReply("❌ Session not found.");

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!(await isExaminer(member, sessionId))) {
      return interaction.editReply("🚫 Only examiners / host can use this.");
    }

    const nextUser = await callNext(sessionId);
    if (!nextUser) return interaction.editReply("⚠️ No participants left.");

    // ✅ DM 전송 시도
    try {
      const user = await client.users.fetch(nextUser);
      await user.send(`
🔔 **Your turn, <@${nextUser}>!**

Please join the private server:
${session.link}

If you fail to join in time, you may lose your position.
      `);

      await updateSessionEmbed(session, client);
      return interaction.editReply(`✅ Called <@${nextUser}> (Link sent in DM).`);
    } catch {
      console.log("DM FAILED → fallback channel.");
    }

    // =========================
    // ✅ DM 실패 → Private Channel 생성
    // =========================
    const guild = interaction.guild;
    const testers = await getTesters(sessionId);
    const categoryId = "1408403041702641714";

    const username = (await client.users.fetch(nextUser)).username.toLowerCase().replace(/\s+/g, "-");
    const channelName = `test-${username}`;

    const existing = guild.channels.cache.find(ch => ch.name === channelName);
    if (existing) await existing.delete().catch(() => {});

    const channel = await guild.channels.create({
      name: channelName,
      parent: categoryId,
      type: 0,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: ["ViewChannel"] },
        { id: nextUser, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
        ...testers.map(id => ({
          id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
        }))
      ]
    });

    // ✅ 호출 채널 DB 저장 (세션 종료 시 일괄 정리)
    await pool.query(
      `INSERT IGNORE INTO session_call_channels (session_id, channel_id)
       VALUES (?, ?)`,
      [sessionId, channel.id]
    );

    await channel.send(`
🔔 **Your turn, <@${nextUser}>!**

Please join the private server:
${session.link}

If you fail to join in time, you may lose your position.
    `);

    await updateSessionEmbed(session, client);

    return interaction.editReply(`✅ Called <@${nextUser}>. DM failed → Private channel created.`);
  }
};
