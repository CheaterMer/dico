// interactions/buttons/setroles.js
import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { pool } from "../../config/db.js";

const HIGH_TESTER_ROLE = "1408415932660846673";

// 등급(티어) 역할만 노출
const TIER_ROLE_OPTIONS = [
  // label, value(=roleId)
  ["HT1", "1408395786131079221"],
  ["LT1", "1408395784264749117"],
  ["HT2", "1408395781991567512"],
  ["LT2", "1408395779378384980"],
  ["HT3", "1408395776920387606"],
  ["LT3", "1435534714982105148"],
];

export default {
  customIdStartsWith: "setroles:",

  async execute(interaction) {
    const requestId = interaction.customId.split(":")[1];
    const guild = interaction.guild;
    const executor = await guild.members.fetch(interaction.user.id);

    if (!executor.roles.cache.has(HIGH_TESTER_ROLE)) {
      return interaction.reply({ content: `🚫 Only <@&${HIGH_TESTER_ROLE}> can set allowed roles.`, ephemeral: true });
    }

    // 요청이 유효한지 간단히 체크
    const [[req]] = await pool.query(`
      SELECT id FROM ht_requests WHERE id=? AND guild_id=? AND status='OPEN'
    `, [requestId, guild.id]);
    if (!req) return interaction.reply({ content: "❌ This test request is not open or no longer exists.", ephemeral: true });

    // 등급 전용 셀렉트 메뉴 (최대 5개 선택)
    const select = new StringSelectMenuBuilder()
      .setCustomId(`setroles_menu:${requestId}`)
      .setPlaceholder("Select up to 5 allowed roles…")
      .setMinValues(1)
      .setMaxValues(5)
      .addOptions(
        TIER_ROLE_OPTIONS.map(([label, value]) =>
          new StringSelectMenuOptionBuilder().setLabel(label).setValue(value)
        )
      );

    const row = new ActionRowBuilder().addComponents(select);

    return interaction.reply({
      content: "🔧 Select the **allowed opponent roles** for this test.",
      components: [row],
      ephemeral: true
    });
  }
};
