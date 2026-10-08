import zipfile, json, os, sys, glob
SP='/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/'
ID, NAME, TITLE, NO = sys.argv[1:5]
O=SP+'out2/'+ID+'/'; top=f'{NO}_{NAME}_3D_v4/'
parts=json.load(open(O+'print/parts.json'))
fin=json.load(open(SP+f'c3d/sheet-finish-{ID}.json'))
stl=sorted(f for f in os.listdir(O+'print') if f.endswith('.stl'))
ptab='\n'.join(f'  {f:<34} {parts["colors"].get(f[3:-4],"")}  {fin.get(f[3:-4],"")}' for f in stl if f[:2].isdigit())
readme=f'''에듀이노 {TITLE} — 3D 패키지 v4
================================

01_렌더      경로 추적(빛을 실제로 튕겨 계산한) 제품 사진식 렌더 1024×1024
02_영상      360° 회전(MP4 · GIF · 투명배경 WebM), 동작 + 표정 모션 릴(MP4 · GIF)
03_설정시트  정투영 정면 · 측면 · 후면 + mm 치수, 색 · 재질표, 표정 7종, 동작 5종
04_투명PNG   그림자 없는 투명 배경 1600×1600 (포즈 · 표정 7장) — 문서 · 굿즈 시안용
05_3D        {NAME}_애니메이션.glb : 뼈대 + 동작 5종(대기 · 인사 · 걷기 · 점프 · 환호) 내장
             Blender: File > Import > glTF 2.0 → Dope Sheet / Action Editor 에서 동작 선택
             Unity: GLTFast 등 glTF 임포터로 불러오면 Animation Clip 으로 나뉘어 들어와요.
{"             "+NAME+"_경량.glb : 웹 · 모바일용 저폴리(삼각형 약 절반)" if os.path.exists(O+NAME+"_경량.glb") else ""}
06_AR        {NAME}_AR_30cm.usdz : 아이폰 · 아이패드에서 파일을 탭하면 AR 빠른 보기(실제 30cm)
             {NAME}_AR_30cm.glb  : 안드로이드 Scene Viewer · 웹 model-viewer 용(동작 포함)
07_프린트    단위 mm · Z 위 · 앞면 −Y (슬라이서에서 그대로 세워져요). 모든 부품 수밀(열린 모서리 0) 확인.
             {NAME}_통짜_100mm.stl        한 번에 출력(단색) — 키 100mm
             {NAME}_받침대일체_106mm.stl   둥근 받침대 Ø{round(parts["baseR"]*2)}×6mm 와 붙은 버전
             받침대_R{round(parts["baseR"])}mm.stl            받침대만(따로 출력 후 접착)
             {NAME}_키링_40mm.stl         40mm + 안테나 위 고리 Ø8.3mm — 레진(SLA) 출력 권장
             색 분리 부품(멀티컬러 프린터 · 도색용, 같은 좌표라 불러오면 제자리에 맞춰져요):
{ptab}

참고
- 표정은 GLB 안에서 기본 표정만 보입니다(나머지 표정은 3D 뷰어 페이지에서 바꿔 볼 수 있어요).
- 얇은 부분(안테나 줄기 · 망토 끝)은 40mm 키링에서 0.5mm 안팎이라 FDM 보다 레진 출력이 안전해요.
'''
groups=[('01_렌더',glob.glob(O+'렌더/*.jpg')),('02_영상',glob.glob(O+'video/*')),('03_설정시트',glob.glob(O+'*_설정시트.png')),('04_투명PNG',glob.glob(O+'투명PNG/*.png')),
        ('05_3D',[O+NAME+'_애니메이션.glb']+([O+NAME+'_경량.glb'] if os.path.exists(O+NAME+'_경량.glb') else [])),('06_AR',[O+NAME+'_AR_30cm.usdz',O+NAME+'_AR_30cm.glb']),('07_프린트',[O+'print/'+f for f in stl])]
zp=SP+f'{NO}_{NAME}_3D_v4.zip'
with zipfile.ZipFile(zp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    z.writestr(top+'읽어보기.txt',readme)
    for g,fs in groups:
        for f in sorted(fs): z.write(f, top+g+'/'+os.path.basename(f))
print(zp, round(os.path.getsize(zp)/1e6,1),'MB', sum(len(f) for _,f in groups),'files')
