import { google } from "googleapis";
import fs from "fs";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(fs.readFileSync("./config/google-service-key.json", "utf8")),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ✅ 시트 이름 자동 감지
async function getSheetName(sheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  return meta.data.sheets[0].properties.title; // 첫 번째 시트
}

// ✅ 사용자 삽입 / 위치 갱신
export async function upsertByDiscordId(sheetId, discordId, robloxName) {
  const SHEET_NAME = await getSheetName(sheetId);
  const formatted = robloxName ? `${robloxName} (${discordId})` : "";

  const columns = [
    { col: "B", range: "B2:B1000" },
    { col: "D", range: "D2:D1000" },
    { col: "F", range: "F2:F1000" },
    { col: "H", range: "H2:H1000" },
    { col: "J", range: "J2:J1000" },
  ];

  for (const t of columns) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!${t.range}`,
    }).catch(() => ({ data: { values: [] } }));

    const cells = (res.data.values || []).map(v => v[0] ?? "");
    const index = cells.findIndex(x => x.includes(`(${discordId})`));

    if (index >= 0) {
      const row = index + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_NAME}!${t.col}${row}`,
        valueInputOption: "RAW",
        requestBody: { values: [[formatted]] },
      });
      return true;
    }
  }
  return false;
}

export async function sortTiers(sheetId, guild, isHighTier) {
  const SHEET_NAME = await getSheetName(sheetId);

  const REGION_MAP = {
    'Japan': 'JP',
    'Singapore': 'SG',
    'India': 'IND'
  };

  // region role ID → region label
  const regionFromMember = (member) => {
    for (const [regionName, roleId] of Object.entries(regionRoleMap)) {
      if (member.roles.cache.has(roleId)) return REGION_MAP[regionName];
    }
    return "ZZ"; // 정렬에서 맨 마지막 (region 없음)
  };

  const columns = [
    { col: "B", range: "B2:B1000" },
    { col: "D", range: "D2:D1000" },
    { col: "F", range: "F2:F1000" },
    { col: "H", range: "H2:H1000" },
    { col: "J", range: "J2:J1000" },
  ];

  for (const t of columns) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!${t.range}`,
    }).catch(() => ({ data: { values: [] } }));

    const rows = (res.data.values || []).map(v => v[0]).filter(Boolean);

    const parsed = rows.map(text => {
      const id = text.match(/\((\d+)\)/)?.[1];
      return { text, id };
    });

    // 분류
    const HT = [];
    const LT = [];

    for (const row of parsed) {
      const member = row.id ? await guild.members.fetch(row.id).catch(() => null) : null;

      if (member) {
        const region = regionFromMember(member);
        const entry = { text: row.text, region };

        if (isHighTier(member)) HT.push(entry);
        else LT.push(entry);
      } else {
        // 멤버가 서버에 없으면 LT 맨 아래로
        LT.push({ text: row.text, region: "ZZ" });
      }
    }

    // ✅ 정렬 기준:
    // 1) 이름 ABC
    // 2) 같은 이름이면 Region (JP < SG < IND < ZZ)
    const sorter = (a, b) =>
      a.text.localeCompare(b.text) || a.region.localeCompare(b.region);

    HT.sort(sorter);
    LT.sort(sorter);

    const sorted = [...HT, ...LT].map(v => [v.text]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_NAME}!${t.range}`,
      valueInputOption: "RAW",
      requestBody: { values: sorted },
    });
  }
}
