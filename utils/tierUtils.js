// utils/tierUtils.js
import { rankRoleMap } from "../config/rolemap.js";

export function isHighTier(member) {
  for (const key in rankRoleMap) {
    const roleId = rankRoleMap[key];

    if (member.roles.cache.has(roleId)) {
      // RHT / HT → High Tier
      if (key.startsWith("RHT") || key.startsWith("HT")) return true;
      // LT → Low Tier
      if (key.startsWith("RLT") || key.startsWith("LT")) return false;
    }
  }
  return false; // 랭크 없음 = LT 아래 취급
}
