import {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
  //GatewayIntentBits.Guilds, 
  //GatewayIntentBits.GuildMessages,
  //GatewayIntentBits.MessageContent,
  //GuildMessages,
  //Guilds,
  //MessageContent,
  Routes,   
  ActivityType,
  GuildMember,
  PermissionsBitField,
  Guild,
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  DMChannel,
} from 'discord.js';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
import { Target } from 'puppeteer';
import axios from 'axios';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const guildDataFile = './guildData.json';
const allowedRoleIds = [
    "1429813967601270895", // tester
    "1408415932660846673", // high tester
];

                // 지역별 채널 설정
const regionChannelMap = {
    'Japan': '1408403945067380846',
    'Singapore': '1408403900222144562',
    'India': '1408403868769062993',
};

let guildData = {};

// === JSON 불러오기 ===
if (fs.existsSync(guildDataFile)) {
    guildData = JSON.parse(fs.readFileSync(guildDataFile, 'utf8'));
}

// === 저장 함수 ===
function saveData() {
    fs.writeFileSync(guildDataFile, JSON.stringify(guildData, null, 2));
}

// === 멤버 데이터 초기화 ===
function ensureMemberData(guildId, userId) {
    if (!guildData[guildId]) {
        guildData[guildId] = { members: {}, clans: {} };
    }

    if (!guildData[guildId].members[userId]) {
        guildData[guildId].members[userId] = {
            rank: 'UnRanked',
            clan: null,
            leaveTimestamp: null,
            status: 'Active', // ✅ 기본 상태값 추가
        };
    } else {
        // ✅ 기존 유저 데이터에 status 필드가 없을 경우 추가
        if (!guildData[guildId].members[userId].status) {
            guildData[guildId].members[userId].status = 'Active';
        }
    }

    return guildData[guildId].members[userId];
}


// === Get Discord To Roblox ID == 
async function discordToRobloxId(discordId, apiKey, guildId) {
    try {
        const url = `https://api.blox.link/v4/public/guilds/${guildId}/discord-to-roblox/${discordId}`;
        const response = await fetch(url, { headers: { Authorization: apiKey } });
        const data = await response.json();
        return data.robloxID || null;
    } catch (err) {
        console.error('Bloxlink fetch error:', err);
        return null;
    }
}

async function getRobloxThumbnail(userId) {
    const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`;
    const res = await fetch(url);
    const data = await res.json();
    return data.data[0].imageUrl; // Embed에 넣을 실제 URL
}

async function getRobloxInfo(discordId, apiKey, guildId) {
    try {
        const robloxId = await discordToRobloxId(discordId, apiKey, guildId);
        if (!robloxId) return null;

        const robloxResponse = await axios.get(`https://users.roblox.com/v1/users/${robloxId}`);
        const { name, displayName } = robloxResponse.data;
        return { robloxId, name, displayName };
    } catch (err) {
        console.error('Error fetching Roblox info:', err);
        return null;
    }
}

// ===== Slash Commands 등록 =====
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const guildId = process.env.GUILD_ID;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return console.error('❌ Guild not found');

    // === Slash Command Registration ===
    await guild.commands.set([
        // ✅ /id
        new SlashCommandBuilder()
            .setName('id')
            .setDescription('Check a user\'s ID card.')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user to check')
                    .setRequired(false)
            ),

        // ✅ /rank
        new SlashCommandBuilder()
            .setName('rank')
            .setDescription('View a user\'s Rank Card.')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setDescription('The user to check')
                    .setRequired(false)
            ),

        // ✅ /setrank
        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('Set a user\'s HT rank.')
            .addUserOption(option =>
                option
                    .setName('target')
                    .setDescription('Target member')
                    .setRequired(true)
            )
                .addStringOption(option =>
            option.setName('rg')
                .setDescription('New status')
                .setRequired(true)
                .addChoices(
                    { name: 'JP', value: 'Japan' },
                    { name: 'SG', value: 'Singapore' },
                    { name: 'IND', value: 'India' },
                ))
            .addStringOption(option =>
                option
                    .setName('rank')
                    .setDescription('The rank to assign')
                    .setRequired(true)
                    .addChoices(
        { name: 'RHT1', value: 'RHT1' },
        { name: 'RLT1', value: 'RLT1' },
        { name: 'RHT2', value: 'RHT2' },
        { name: 'RLT2', value: 'RLT2' },
        { name: 'RHT3', value: 'RHT3' },
        { name: 'HT1', value: 'HT1' },
        { name: 'LT1', value: 'LT1' },
        { name: 'HT2', value: 'HT2' },
        { name: 'LT2', value: 'LT2' },
        { name: 'HT3', value: 'HT3' },
        { name: 'LT3', value: 'LT3' },
        { name: 'HT4', value: 'HT4' },
        { name: 'LT4', value: 'LT4' },
        { name: 'HT5', value: 'HT5' },
        { name: 'LT5', value: 'LT5' },
        { name: 'UnRanked', value: 'UnRanked' }
                    )
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),


            new SlashCommandBuilder()
            .setName('opentest')
            .setDescription('Start an official test and assign two examiners.')
            .addUserOption(option =>
                option
                    .setName('tester1')
                    .setDescription('Mention the first tester or high tester.')
                    .setRequired(true)
            )
            .addUserOption(option =>
                option
                    .setName('tester2')
                    .setDescription('Mention the second tester or high tester.')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('rg')
                    .setDescription('Select the testing region.')
                    .setRequired(true)
                    .addChoices(
                        { name: 'JP', value: 'Japan' },
                        { name: 'SG', value: 'Singapore' },
                        { name: 'IND', value: 'India' },
                    )
            )
            .addStringOption(option =>
                option
                    .setName('link')
                    .setDescription('Provide the reference or registration link.')
                    .setRequired(true)
            ),
                // .setDefaultMemberPermissions(PermissionFlagsBits.),

        new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Change a member’s status (Active, Retired, LOA)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to update')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('New status')
                .setRequired(true)
                .addChoices(
                    { name: 'Active', value: 'Active' },
                    { name: 'Retired', value: 'Retired' },
                    { name: 'LOA (Leave of Absence)', value: 'LOA' },
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    ].map(cmd => cmd.toJSON()));


    client.user.setActivity('TSBAC Rank System', { type: ActivityType.Playing });
    console.log('✅ Slash commands registered!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const guildId = interaction.guildId;

    try {
        // ✅ deferReply로 3초 제한 방지
        await interaction.deferReply({ ephemeral: false });

        // === /id ===
        if (interaction.commandName === 'id') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id);
            const memberData = ensureMemberData(guildId, targetUser.id);

            const robloxId = await discordToRobloxId(targetUser.id, process.env.BLOXLINK_API, guildId);

            if (!robloxId) {
                return await interaction.editReply({
                    content: ':x: Bloxlink API rejected your request.\nThis server\'s API key may be missing or misconfigured.',
                });
            }

            const robloxLink = `[Roblox Profile](https://www.roblox.com/users/${robloxId}/profile)`;
            const status = memberData.status || 'Active';

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s ID Card`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Discord', value: `${targetUser.tag}`, inline: true },
                    { name: 'Roblox', value: robloxLink, inline: true },
                    { name: 'Rank', value: memberData.rank || 'None', inline: true },
                    { name: 'Clan', value: memberData.clan || 'None', inline: true },
                    { name: 'Status', value: status, inline: true },
                )
                .setColor('#00b0f4')
                .setFooter({ text: 'HT System | ID Card' });

            return await interaction.editReply({ embeds: [embed] });
        }

        // === /rank ===
        if (interaction.commandName === 'rank') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id);
            const memberData = ensureMemberData(guildId, targetUser.id);

            let robloxAvatar = targetUser.displayAvatarURL({ dynamic: true });
            const robloxId = await discordToRobloxId(targetUser.id, process.env.BLOXLINK_API, guildId);

            if (robloxId) {
                const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`);
                const data = await res.json();
                if (data?.data?.[0]?.imageUrl) robloxAvatar = data.data[0].imageUrl;
            }

            const robloxLink = robloxId ? `[View Profile](https://www.roblox.com/users/${robloxId}/profile)` : 'Not linked';

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Rank Card`)
                .setThumbnail(robloxAvatar)
                .addFields(
                    { name: 'Rank', value: memberData.rank || 'None', inline: true },
                    { name: 'Clan', value: memberData.clan || 'None', inline: true },
                    { name: 'Roblox Profile', value: robloxLink, inline: true },
                )
                .setColor('#ff9900')
                .setFooter({ text: 'HT System | Rank Card' });

            return await interaction.editReply({ embeds: [embed] });
        }

        // === /setstatus ===
        if (interaction.commandName === 'setstatus') {
            const targetUser = interaction.options.getUser('user');
            const newStatus = interaction.options.getString('status');

            const allowedRoleId = "1429502904624091290";
            const ownerId = process.env.OWNER_ID;

            const meme = await interaction.guild.members.fetch(interaction.user.id);
            const hasAllowedRole = meme.roles.cache.some(role => allowedRoleIds.includes(role.id));

            if (
                !hasAllowedRole && interaction.user.id !== ownerId

            ) {
                await interaction.editReply({ content: '🚫 You don’t have permission to use this command.' });
                return;
            }

           // if (!interaction.member.roles.cache.has(allowedRoleId) && interaction.user.id !== ownerId) {
           //     return await interaction.editReply({ content: '🚫 You don’t have permission to use this command.' });
           // }

            const memberData = ensureMemberData(guildId, targetUser.id);
            const oldStatus = memberData.status;
            const ranks = memberData.rank;
            memberData.status = newStatus;
            saveData();

            const embed = new EmbedBuilder()
                .setTitle('✅ Member Status Updated')
                .addFields(
                    { name: 'Username', value: `${targetUser}`, inline: false },
                    { name: 'Rank', value: ranks, inline: false },
                    { name: 'Previous Status', value: oldStatus, inline: false },
                    { name: 'New Status', value: newStatus, inline: false },
                )
                .setColor('#00ff99')
                .setFooter({ text: 'Rank System | Status Management' });

            return await interaction.editReply({ embeds: [embed] });
        }

        // === /setrank ===
        if (interaction.commandName === 'setrank') {
            const target = interaction.options.getUser('target');
            const newRank = interaction.options.getString('rank');
            const rg = interaction.options.getString('rg')

            //const allowedRoleId = "1429502904624091290";
            const ownerId = process.env.OWNER_ID;
            const meme = await interaction.guild.members.fetch(interaction.user.id);
            const hasAllowedRole = meme.roles.cache.some(role => allowedRoleIds.includes(role.id));

            if (
                !hasAllowedRole && interaction.user.id !== ownerId

            ) {
                await interaction.editReply({ content: '🚫 You don’t have permission to use this command.' });
                return;
            }

            const member = await interaction.guild.members.fetch(target.id);
            const targetData = ensureMemberData(guildId, target.id);
            const previousRank = targetData.rank;
            targetData.rank = newRank;
            saveData();

            const rankRoleMap = {
                'RHT1': '1430560048832053370',
                'RLT1': '1430560094948692138',
                'RHT2': '1430560130939879496',
                'RLT2': '1430560170613936300',
                'RHT3': '1430560294752485568',
                'HT1': '1408395786131079221',
                'LT1': '1408395784264749117',
                'HT2': '1408395781991567512',
                'LT2': '1408395779378384980',
                'HT3': '1408395776920387606',
                'LT3': '1408395774869635122',
                'HT4': '1408395771853672488',
                'LT4': '1408395769161187368',
                'HT5': '1408395767508504618',
                'LT5': '1408395342713585724',
            };

            const rolemap = {
                'Japan': '1431460359402819785',
                'Singapore': '1431286613316603934',
                'India': '1431460282361843843',
            }

            const rgroleId = rolemap[rg];
            const rgrole = interaction.guild.roles.cache.get(rgroleId);
            console.log(rg,rgroleId,rgrole)
            if (rgrole) {
                // 기존 region 역할 제거
                const htRoles = Object.values(rolemap)
                    .map(id => interaction.guild.roles.cache.get(id))
                    .filter(r => r && member.roles.cache.has(r.id));

                for (const r of htRoles) {
                    if (r.id !== rgrole.id) await member.roles.remove(r).catch(() => {});
                }

                if (!member.roles.cache.has(rgrole.id)) await member.roles.add(rgrole).catch(() => {});
            }

            const roleId = rankRoleMap[newRank];
            const role = interaction.guild.roles.cache.get(roleId);

            if (role) {
                // 기존 HT 역할 제거
                const htRoles = Object.values(rankRoleMap)
                    .map(id => interaction.guild.roles.cache.get(id))
                    .filter(r => r && member.roles.cache.has(r.id));

                for (const r of htRoles) {
                    if (r.id !== role.id) await member.roles.remove(r).catch(() => {});
                }

                if (!member.roles.cache.has(role.id)) await member.roles.add(role).catch(() => {});
            }
            
            const robloxId = await discordToRobloxId(target.id, process.env.BLOXLINK_API, guildId);

            if (!robloxId) {
                return await interaction.editReply({
                    content: ':x: Bloxlink API rejected your request.\nThis server\'s API key may be missing or misconfigured.',
                });
            }

            // 사용 예시
            const avatarURL = await getRobloxThumbnail(robloxId);

            const embed = new EmbedBuilder()
                .setTitle(`${target.tag}  's  Test  Results   🏆`)
                .setThumbnail(avatarURL)
                //.setThumbnail(target.displayAvatarURL({ dynamic: true })) // Discord 아바타
                //.setImage(robloxAvatarURL) // Roblox 아바타
                .addFields(
                    { name: 'Tester', value: `${meme}`, inline: false },
                    { name: 'Region', value: rg, inline: false },
                    { name: 'Username', value: `<@${target.id}>`, inline: false },
                    { name: 'Previous Rank', value: previousRank, inline: false },
                    { name: 'Rank Earned', value: newRank, inline: false },
                )
                .setColor('#94ffaf')
                .setFooter({ text: 'Rank System | Rank Card' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], content: `✅ <@${target.id}>'s rank has been set.` });
            }

            // === /opentest ===
            if (interaction.commandName === 'opentest') {
                const tester1 = interaction.options.getUser('tester1');
                const tester2 = interaction.options.getUser('tester2');
                const rg = interaction.options.getString('rg');
                const link = interaction.options.getString('link');

                const guildId = interaction.guild.id;
                const guild = interaction.guild;

                // 멤버 정보 가져오기
                const member1 = await guild.members.fetch(tester1.id);
                const member2 = await guild.members.fetch(tester2.id);

                const isTester1Valid = member1.roles.cache.some(role => allowedRoleIds.includes(role.id));
                const isTester2Valid = member2.roles.cache.some(role => allowedRoleIds.includes(role.id));

            if (
                !hasAllowedRole && interaction.user.id !== ownerId

            ) {
                await interaction.editReply({ content: '🚫 You don’t have permission to use this command.' });
                return;
            }


                if (!isTester1Valid || !isTester2Valid) {
                    return await interaction.editReply({
                        content: '🚫 Both testers must have either the Tester or High Tester role.',
                    });
                }

                const targetChannelId = regionChannelMap[rg];
                const targetChannel = guild.channels.cache.get(targetChannelId);

                if (!targetChannel) {
                    return await interaction.editReply({
                        content: `❌ No channel configured for region: ${rg}`,
                    });
                }

                // === Roblox 프로필 정보 가져오기 ===targetUser.id, process.env.BLOXLINK_API, guildId
                async function getRobloxInfo(discordId, apiKey, guildId) {
                    try {
                        const robloxId = await discordToRobloxId(discordId, apiKey, guildId);
                        if (!robloxId) return null;

                        const robloxResponse = await axios.get(`https://users.roblox.com/v1/users/${robloxId}`);
                        const { name, displayName } = robloxResponse.data;
                        return { robloxId, name, displayName };
                    } catch (err) {
                        console.error('Error fetching Roblox info:', err);
                        return null;
                    }
                }

                const rbx1 = await getRobloxInfo(tester1.id,process.env.BLOXLINK_API,guildId);
                const rbx2 = await getRobloxInfo(tester2.id,process.env.BLOXLINK_API,guildId);

                console.log(rbx1,rbx2)

                if (!rbx1 || !rbx2) {
                    return await interaction.editReply({
                        content: ':x: Failed to retrieve Roblox profiles. Please ensure both testers are verified via Bloxlink.',
                    });
                }

                // Roblox 썸네일 가져오기
                async function getRobloxThumbnail(id) {
                    try {
                        const thumbRes = await axios.get(
                            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=180x180&format=Png&isCircular=false`
                        );
                        return thumbRes.data.data[0]?.imageUrl || null;
                    } catch {
                        return null;
                    }
                }

                const avatarURL = await getRobloxThumbnail(rbx1.robloxId);

                                // 테스터 1 임베드
                const embed1 = new EmbedBuilder()
                    .setTitle('🧑‍💻 Examiner 1')
                    .setDescription(`${tester1} \n**Roblox:** ${rbx1.name}\n**Display Name:** ${rbx1.displayName}`)
                    .setColor('#00BFFF')
                    .setTimestamp();
                if (avatarURL) embed1.setThumbnail(avatarURL);

                // 테스터 2 임베드
                const avatarURL2 = await getRobloxThumbnail(rbx2.robloxId);
                const embed2 = new EmbedBuilder()
                    .setTitle('🧑‍💻 Examiner 2')
                    .setDescription(`${tester2} \n**Roblox:** ${rbx2.name}\n**Display Name:** ${rbx2.displayName}`)
                    .setColor('#00BFFF')
                    .setTimestamp();
                if (avatarURL2) embed2.setThumbnail(avatarURL2);

                // 지역 + 링크 임베드
                const embed3 = new EmbedBuilder()
                    .setTitle('📍 Test Details')
                    .addFields(
                        { name: 'Region', value: rg, inline: true },
                        { name: 'Link', value: `[Join VIP Server](${link})`, inline: false },
                      //  { name: 'Link', value: link, inline: false },
                    )
                    .setColor('#00BFFF')
                    .setFooter({ text: 'HT System | Test Session Opened' })
                    //.addFields({ name: 'Link', value: `[Join VIP Server](${link})`, inline: false },)

                    .setTimestamp();

                // 채널에 임베드 전송
                await targetChannel.send({ embeds: [embed1, embed2, embed3] });

                // interaction 회신
                await interaction.editReply({
                    content: `✅ Test session opened successfully in **${rg}** region.\nPosted in <#${targetChannelId}>.`,
                });
            }

    } catch (err) {
        console.error('Interaction Error:', err);
        if (!interaction.replied) {
            await interaction.reply({ content: '❌ An unexpected error occurred.' });
        }
    }
});


client.login(process.env.TOKEN);
