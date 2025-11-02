// commands/test/opensession.js
import { SlashCommandBuilder } from "discord.js";
import { pool } from "../../config/db.js";
import { updateSessionEmbed } from "../../utils/sessionUtils.js";

export default {
  data: new SlashCommandBuilder()
    .setName("opensession")
    .setDescription("Open a new test session and assign examiners.")
    .addStringOption(opt =>
      opt.setName("region")
        .setDescription("Select the test region")
        .setRequired(true)
        .addChoices(
          { name: "🇯🇵 Japan", value: "Japan" },
          { name: "🇸🇬 Singapore", value: "Singapore" },
          { name: "🇮🇳 India", value: "India" }
        )
    )
    .addStringOption(opt =>
      opt.setName("link")
        .setDescription("Private server link")
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName("tester1")
        .setDescription("First tester")
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName("tester2")
        .setDescription("Second tester (optional)")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ flags: 64 });

    const region = interaction.options.getString("region");
    const link = interaction.options.getString("link");
    const tester1 = interaction.options.getUser("tester1");
    const tester2 = interaction.options.getUser("tester2");
    const host = interaction.user;

    const vipLinkRegex = /^https:\/\/www\.roblox\.com\/share\?code=[a-fA-F0-9]{32}&type=Server$/;

   // ✅ 링크 형식 체크
   if (!vipLinkRegex.test(link)) {
     return interaction.editReply("❌ Invalid VIP server link format.\n\nMust be like:\n`https://www.roblox.com/share?code=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&type=Server`");
   }

    // ✅ 세션 생성
    const [result] = await pool.query(
      `INSERT INTO test_sessions (guild_id, channel_id, region, link, hoster_tag)
       VALUES (?, ?, ?, ?, ?)`,
      [interaction.guildId, interaction.channel.id, region, link, host.tag]
    );

    const sessionId = result.insertId;

    // ✅ 시험관 등록 (호스트 + tester1 + tester2(있으면))
    const testers = [host.id, tester1.id];
    if (tester2) testers.push(tester2.id);

    for (const id of testers) {
      await pool.query(
        `INSERT IGNORE INTO session_testers (session_id, user_id)
         VALUES (?, ?)`,
        [sessionId, id]
      );
    }

    // ✅ UI 메시지 생성
    const placeholder = await interaction.channel.send("🔧 Generating session interface...");
    await pool.query(
      `UPDATE test_sessions SET message_id = ? WHERE session_id = ?`,
      [placeholder.id, sessionId]
    );

    // ✅ UI 업데이트
    const [[fresh]] = await pool.query(`SELECT * FROM test_sessions WHERE session_id = ?`, [sessionId]);
    await updateSessionEmbed(fresh, client);

    return interaction.editReply(
      `✅ **Session #${sessionId} opened.**\n` +
      `🌍 Region: **${region}**\n` +
      `🧑‍💼 Host: **${host.tag}**\n` +
      `🎓 Testers: <@${testers.join(">, <@")}>`
    );
  }
};
