// utils/sendNotice.js
import { PermissionFlagsBits, ChannelType } from "discord.js";

const HIGH_TESTER_ROLE = "1408415932660846673";
const LOG_CHANNEL = "1433141180371304448";
const NOTICE_CATEGORY = "1435528706947813498";

export async function sendNotice(client, guild, userId, message) {
  const logChannel = await client.channels.fetch(LOG_CHANNEL).catch(() => null);

  // 1) DM 시도
  try {
    const user = await client.users.fetch(userId);
    await user.send(message);

    if (logChannel) logChannel.send(`📩 DM Sent → <@${userId}>`);
    return;
  } catch (err) {
    if (logChannel) logChannel.send(`⚠️ DM Failed → <@${userId}> | Creating notice channel...`);
  }

  // 2) DM 불가 → 임시 채널 생성
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  const channel = await guild.channels.create({
    name: `ht-notice-${userId}`,
    type: ChannelType.GuildText,
    parent: NOTICE_CATEGORY,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
      { id: HIGH_TESTER_ROLE, allow: [PermissionFlagsBits.ViewChannel] }
    ]
  });

  await channel.send(message);

  if (logChannel) logChannel.send(`✅ Temp Notice Channel Created → ${channel}`);

  // 10분 후 자동 삭제
  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 10 * 60 * 1000);
}
