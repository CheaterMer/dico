import { rankRoleMap, regionRoleMap } from '../config/rolemap.js';

export async function applyRoles(member, rank, region) {

  // 제거 대상 역할들
  const allRankRoles = Object.values(rankRoleMap);
  const allRegionRoles = Object.values(regionRoleMap);

  // 1) 기존 Rank 역할 제거
  for (const role of allRankRoles) {
    if (member.roles.cache.has(role)) {
      await member.roles.remove(role).catch(() => {});
    }
  }

  // 2) 새 Rank 역할 부여
  if (rankRoleMap[rank]) {
    await member.roles.add(rankRoleMap[rank]).catch(() => {});
  }

  // 3) 기존 Region 역할 제거
  for (const role of allRegionRoles) {
    if (member.roles.cache.has(role)) {
      await member.roles.remove(role).catch(() => {});
    }
  }

  // 4) 새 Region 역할 부여
  if (regionRoleMap[region]) {
    await member.roles.add(regionRoleMap[region]).catch(() => {});
  }

  return true;
}
