import discord,os,subprocess
from discord.ext import commands

import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime
#access_token = os.environ["MTIyMjEyNjQxMzIyMjUxMDY0Mg.GB8TZ1.iuT9jy7hgaJg8MuOieBfx9mexb1vYDaXSOzu30"]
TOKEN = 'MTIyMjEyNjQxMzIyMjUxMDY0Mg.GB8TZ1.iuT9jy7hgaJg8MuOieBfx9mexb1vYDaXSOzu30'
    #'MTE3Mjc5MTI4Njk4MjUwODYxNA.GmIar5.Tu15aJndiFj8HTlNMkdDNGQsiJMd2Of6ZlJWUY'

source_channel_id = 1222101866524184656  # 여기에 원본 채널의 ID를 입력하세요
target_channel_id = 1222022681415909477   # 여기에 대상 채널의 ID를 입력하세요


intents = discord.Intents.default()
intents.message_content = True
client = commands.Bot(command_prefix='!', intents=intents)

@client.event
async def on_ready():
    await client.change_presence(status=discord.Status.online, activity=discord.Game("!실행 을 하면 서버가 켜짐;; ㄷㄷ 쵀싄 긔슬;;;!"))


# 특정 역할의 ID 설정
allowed_role_id = 1118505510765871107

# 청소 명령을 처리하는 함수
@client.command()
async def 청소(ctx, amount: int):
    # 특정 역할을 가진 사용자만 명령을 실행할 수 있도록 확인
    allowed_role = discord.utils.get(ctx.guild.roles, id=allowed_role_id)
    if allowed_role in ctx.author.roles:
        # 메시지 삭제
        await ctx.channel.purge(limit=amount + 1)
        await ctx.send(f'{amount}개의 메시지를 삭제했습니다.', delete_after=5)
    else:
        await ctx.send("이 명령을 실행할 권한이 없습니다.")


@client.event
async def on_message(message):
    # 봇이 보낸 메시지를 무시
    if message.author == client.user:
        return

    required_role = discord.utils.get(message.guild.roles, id=1227267595510485032)
    if required_role in message.author.roles:
        # 메시지 내용이 '!실행'인 경우 특정 작업 실행
        if message.content.startswith('!실행'):
            # 여기에 실행할 작업을 추가합니다.
            #bat_file_path = "C:\\Users\\머랭\\OneDrive\\바탕 화면\\학교교님 한판해요\\sss.bat"
            directory_path = "C:\\Users\\머랭\\OneDrive\\바탕 화면\\ITSERVER\\"

            os.system(f'start Start.bat.lnk')
            await message.channel.send(f'{message.author.mention} 님의 명령 실행 완료!')

    # 기존의 메시지 이벤트를 처리
    await client.process_commands(message)

    # 원본 채널에서 메시지 받기


    if message.channel.id == source_channel_id:
        target_channel = client.get_channel(target_channel_id)
        if target_channel:
            # 메시지가 이미지나 파일을 포함하는 경우
            if message.attachments:
                for attachment in message.attachments:
                    if attachment.url.endswith(('png', 'jpg', 'jpeg', 'gif')):
                        await target_channel.send(attachment.url)  # 이미지 URL 전송
                    else:
                        await target_channel.send(
                            f"{attachment.url}\n**{message.author.display_name}**님의 파일: {attachment.filename}")
            # 메시지가 스티커를 포함하는 경우
            elif message.stickers:
                for sticker in message.stickers:
                    sticker_url = sticker.url  # 스티커 URL 가져오기
                    await target_channel.send(sticker_url)  # 스티커 URL 전송
            else:
                await target_channel.send(f"**{message.author.display_name}**님의 메시지: {message.content}")

        # 대상 채널에서 메시지 받기
    elif message.channel.id == target_channel_id:
        source_channel = client.get_channel(source_channel_id)
        if source_channel:
            # 메시지가 이미지나 파일을 포함하는 경우
            if message.attachments:
                for attachment in message.attachments:
                    if attachment.url.endswith(('png', 'jpg', 'jpeg', 'gif')):
                        await source_channel.send(attachment.url)  # 이미지 URL 전송
                    else:
                        await source_channel.send(
                            f"{attachment.url}\n**{message.author.display_name}**님의 파일: {attachment.filename}")
            # 메시지가 스티커를 포함하는 경우
            elif message.stickers:
                for sticker in message.stickers:
                    sticker_url = sticker.url  # 스티커 URL 가져오기
                    await source_channel.send(sticker_url)  # 스티커 URL 전송
            else:
                await source_channel.send(f"**{message.author.display_name}**님의 메시지: {message.content}")

    if message.content == '!밥':
        # 해당 웹 페이지의 URL
        url = 'https://school.koreacharts.com/school/meals/B000011323/contents.html'

        # 현재 날짜 가져오기
        current_day = datetime.now().day

        # GET 요청 보내기
        response = requests.get(url)

        # 요청이 성공했는지 확인
        if response.status_code == 200:
            # 중식 메뉴 정보를 저장할 변수
            lunch_menu = ""

            # HTML 파싱을 위한 BeautifulSoup 객체 생성
            soup = BeautifulSoup(response.text, 'html.parser')

            # <tr> 태그 선택하여 메뉴 정보 추출
            menu_tags = soup.find_all('tr')

            # 메뉴 정보 출력
            for menu_tag in menu_tags:
                # 메뉴 정보가 있는 <td> 태그 선택
                td_tags = menu_tag.find_all('td', class_='text-center')

                # <td> 태그가 3개일 때(날짜와 중식 정보를 포함하는 경우)
                if len(td_tags) == 3:
                    # 날짜 정보 가져오기
                    date_info = int(td_tags[0].text.strip())

                    # 현재 날짜와 일치하는 메뉴인 경우에만 저장
                    if date_info == current_day:
                        # 중식 메뉴 정보 가져오기
                        lunch_menu_info = td_tags[2].find('p').text.strip()

                        # [중식] 문자열 제거
                        lunch_menu_info = lunch_menu_info.replace('[중식]', '').strip()

                        # 괄호와 괄호 안의 문자열, 공백을 완전히 제거하여 메뉴 정보 정리
                        menu_without_numbers = re.sub(r'\([^()]*\)', '', lunch_menu_info)

                        # 각 메뉴를 새로운 줄에 추가
                        menu_list = menu_without_numbers.split()
                        for menu in menu_list:
                            lunch_menu += menu + "\n"

            # 변수에 저장된 중식 메뉴 정보 출력
            #print("중식 메뉴:")
            #print(lunch_menu)

                        embed = discord.Embed(title= "[ 급식 메뉴 조회 쓰비쓰 ] \n 오늘은 {} 년 {} 월 {} 일 입니다.".format(datetime.now().year,datetime.now().month,datetime.now().day))
                        embed.add_field(name= f'{lunch_menu}',value="")
                        await message.channel.send(embed=embed)
        else:
            print("요청이 실패했습니다.")
            await message.channel.send('요청이 실패했습니다.')


client.run(TOKEN)
