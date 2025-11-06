// interactions/buttons/volunteer.js
import { pool } from "../../config/db.js";
import { rankRoleMap } from "../../config/rolemap.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";

// 플레이어 티어 가져오기
function getTier(member) {
  return Object.keys(rankRoleMap).find(t =>
    member.roles.cache.has(rankRoleMap[t])
  );
}

// Phase별 허용 등급
const phaseOpponentTiers = {
  1: { HT1: ["LT2"], LT1: ["LT2"], HT2: ["LT2"], LT2: ["LT2"], HT3: ["LT3"], LT3: ["LT3"] },
  2: { HT1: ["HT2"], LT1: ["HT2"], HT2: ["HT2"], LT2: ["LT2"], HT3: ["HT3"], LT3: [] }
};

// Phase별 필요한 인원
const requiredOpponents = { 1: 2, 2: 2 };

export default {
  customIdStartsWith: "volunteer:",

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const requestId = interaction.customId.split(":")[1];
    const guild = interaction.guild;
    const user = await guild.members.fetch(interaction.user.id);

    // 요청 데이터 불러오기
    const [[req]] = await pool.query(`
      SELECT player_id, phase, opponents, panel_channel_id, panel_message_id
      FROM ht_requests WHERE id=?`,
      [requestId]
    );

    const player = await guild.members.fetch(req.player_id);
    const playerTier = getTier(player);

    // ✅ opponents 안전 파싱 (문제 해결)
    let opponents;
    try {
      if (typeof req.opponents === "string") opponents = JSON.parse(req.opponents);
      else opponents = req.opponents || [];
    } catch { opponents = []; }

    // ✅ 자기 자신이 opponents에 들어가 있었던 문제 해결
    opponents = opponents.filter(o => o.user_id !== req.player_id);

    const volunteerTier = getTier(user);
    const allowed = phaseOpponentTiers[req.phase]?.[playerTier] || [];

    // ✅ 지원 가능한 티어인지 확인
    //if (!allowed.includes(volunteerTier)) {
     // return interaction.editReply(`🚫 Allowed for **Phase ${req.phase}**: \`${allowed.join(", ")}\``);
    //}

    // ✅ 중복 등록 방지
    if (opponents.find(o => o.user_id === user.id)) {
      return interaction.editReply("⚠️ You are already registered.");
    }

    // ✅ 지원자 추가
    opponents.push({ user_id: user.id, tier: volunteerTier });

    // ✅ DB 저장
    await pool.query(`UPDATE ht_requests SET opponents=? WHERE id=?`,
      [JSON.stringify(opponents), requestId]);

    const panelChannel = await guild.channels.fetch(req.panel_channel_id);
    const msg = await panelChannel.messages.fetch(req.panel_message_id);

    const current = opponents.length;
    const needed = requiredOpponents[req.phase];

    const embed = new EmbedBuilder()
      .setColor("#00bfff")
      .setTitle(`🔍 Phase ${req.phase} — Looking For Opponents`)
      .setDescription([
        `**Player:** <@${req.player_id}>`,
        `**Tier:** \`${playerTier}\``,
        `**Phase:** \`${req.phase}/4\``,
        `**Needed:** \`${needed}\``,
        `**Current:** \`${current}/${needed}\``,
        ``,
        `Opponents:\n${opponents.map(o => `• <@${o.user_id}> — \`${o.tier}\``).join("\n")}`
      ].join("\n"))
      .setTimestamp();

    // ✅ Phase 완료
    if (current >= needed) {
      const next = req.phase + 1;

      // ✅ opponents 초기화 후 phase 증가
      await pool.query(`UPDATE ht_requests SET phase=?, opponents='[]' WHERE id=?`,
        [next, requestId]);

      // Phase 3+ → 심사 버튼 표시
      if (next >= 3) {
        const pass = new ButtonBuilder().setCustomId(`phasepass:${requestId}`).setLabel("✅ PASS").setStyle(ButtonStyle.Success);
        const fail = new ButtonBuilder().setCustomId(`phasefail:${requestId}`).setLabel("❌ FAIL").setStyle(ButtonStyle.Danger);
        const terr = new ButtonBuilder().setCustomId(`phaseterrible:${requestId}`).setLabel("💀 TERRIBLE").setStyle(ButtonStyle.Secondary);

        await msg.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(pass, fail, terr)] });
        return interaction.editReply(`🎯 **Phase ${req.phase} complete → Phase ${next} (Evaluation)**`);
      }

      // Phase 2 → allowed_roles 업데이트 + volunteer 계속
      const nextAllowed = phaseOpponentTiers[next][playerTier] || [];
      await pool.query(`UPDATE ht_requests SET allowed_roles=? WHERE id=?`,
        [JSON.stringify(nextAllowed), requestId]);

      const volunteerBtn = new ButtonBuilder().setCustomId(`volunteer:${requestId}`).setLabel("Volunteer").setStyle(ButtonStyle.Success);
      await msg.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(volunteerBtn)] });

      return interaction.editReply(`🔥 **Phase ${next} started!** Allowed: \`${nextAllowed.join(", ")}\``);
    }

    // ✅ 아직 부족 → volunteer 유지
    const volunteerBtn = new ButtonBuilder().setCustomId(`volunteer:${requestId}`).setLabel("Volunteer").setStyle(ButtonStyle.Success);
    await msg.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(volunteerBtn)] });

    return interaction.editReply(`✅ Added. (\`${current}/${needed}\`)`);
  }
};
