import mysql from 'mysql2/promise';
import fs from 'fs';

async function main() {
    // 1. DB 연결
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'meringue',
        database: 'discord_ranks'
    });

    // 2. JSON 불러오기
    const data = JSON.parse(fs.readFileSync('guildData.json', 'utf8'));

    // 3. members 테이블에 삽입
    for (const [guildId, guildData] of Object.entries(data)) {
        for (const [userId, member] of Object.entries(guildData.members)) {
            await connection.execute(
                `INSERT INTO members 
                (guild_id, user_id, \`rank\`, clan, leave_timestamp, status)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    \`rank\` = VALUES(\`rank\`), 
                    clan = VALUES(clan),
                    leave_timestamp = VALUES(leave_timestamp),
                    status = VALUES(status)`,
                [guildId, userId, member.rank, member.clan, member.leaveTimestamp, member.status]
            );
        }
    }

    console.log('JSON → MySQL 완료');
    await connection.end();
}

main();
