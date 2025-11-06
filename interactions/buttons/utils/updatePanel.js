// interactions/buttons/utils/updatePanel.js
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { rankRoleMap } from "../../../config/rolemap.js";

export function getTier(member) {
  return Object.keys(rankRoleMap).find(tier =>
    member.roles.cache.has(rankRoleMap[tier])
  );
}

export function buildPhaseButtons(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`phasepass:${requestId}`).setLabel("✅ PASS").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`phasefail:${requestId}`).setLabel("❌ FAIL").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`phaseterrible:${requestId}`).setLabel("💀 TERRIBLE").setStyle(ButtonStyle.Secondary)
  );
}
