// utils/robloxUtils.js
import fetch from 'node-fetch';
import axios from 'axios';

/**
 * 🔗 Discord → Roblox ID 변환 (Bloxlink API 사용)
 */
export async function discordToRobloxId(discordId, apiKey, guildId) {
  try {
    if (!apiKey) return null;

    const url = `https://api.blox.link/v4/public/guilds/${guildId}/discord-to-roblox/${discordId}`;
    const response = await fetch(url, { headers: { Authorization: apiKey } });
    const data = await response.json();

    return data.robloxID || null;
  } catch (err) {
    console.error('Bloxlink fetch error:', err?.message || err);
    return null;
  }
}

/**
 * 👤 Roblox 프로필 기본 정보
 */
export async function getRobloxInfo(discordId, apiKey, guildId) {
  try {
    const robloxId = await discordToRobloxId(discordId, apiKey, guildId);
    if (!robloxId) return null;

    const { data } = await axios.get(`https://users.roblox.com/v1/users/${robloxId}`);
    return {
      robloxId,
      name: data.name,
      displayName: data.displayName,
    };
  } catch (err) {
    console.error('getRobloxInfo error:', err?.message || err);
    return null;
  }
}

/**
 * 🖼️ Roblox 아바타 썸네일 (정상 작동 버전)
 */
export async function getRobloxThumbnail(robloxId) {
  try {
    const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`;
    const res = await fetch(url);
    const data = await res.json();

    return data?.data?.[0]?.imageUrl || null;
  } catch (err) {
    console.error('thumbnail error:', err?.message || err);
    return null;
  }
}
