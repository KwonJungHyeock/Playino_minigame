import base64, json, re, sys
d='/tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/c3d/'
which = sys.argv[1] if len(sys.argv) > 1 else 'visor'
h=open(d+'viewer2-src.html').read()
lib=''.join(open(d+f).read()+'\n' for f in ['font-sub.js','cloth-cache.js','sdf.js','cloth.js','models3.js','anim.js','studio.js'])
if which=='visor':
    cfg={'id':'visor','studio':{'env':['#ffffff','#f8f3e6','#ecdcae','#f6ecd0'],'hemi':[0xffffff,0xe6d3a4],'shadow':0x5a4320,'blob':'70,50,20','exposure':1.1},
         'cam':{'orig':[0.4,0.05,2.4,0.48],'front':[0,0.05,2.4,0.48],'three':[0.75,0.12,2.4,0.48],'side':[1.57,0.05,2.4,0.48],'back':[3.14,0.1,2.4,0.48],'face':[0.25,0.02,1.2,0.63]},
         'parts':{'visor':['Visor','Face','VisorHL','VisorGroove'],'pods':['EarPod_L','EarPod_R'],'helmet':['Helmet','HelmetSeam'],'cape':['Cape']},
         'variants':[{'key':'orig','label':'원본 그대로','opts':{}},{'key':'mod','label':'e 교체 + 진한 색','opts':{'typeE':True,'pod':0xf6a400,'podIn':0xd98a00,'tab':0xe48f00,'ant':0xf0405c,'led':0x16d6f2,'collar':0x2a2e39}}]}
    orig='n01_visor.jpg'
    i=h.index('<pre class="tree" aria-label="관절 구조">'); j=h.index('</pre>',i)
    h=h[:i]+'''<pre class="tree" aria-label="관절 구조">VisorBot
├─ Body (한 덩어리 · 스킨)
├─ Cape (천 시뮬 · 스킨)
└─ Hips
   ├─ Leg_L · Leg_R
   └─ Spine
      ├─ Collar · TabPlate · TabRim · TabText
      ├─ Cape_Root ─ Cape_Mid ─ Cape_Low
      ├─ Arm_L · Arm_R
      └─ Head
         ├─ Helmet · HelmetSeam
         ├─ Visor · VisorGroove
         ├─ Face  LED 표정 7종
         ├─ EarPod_L · EarPod_R
         └─ Antenna  e'''+h[j:]
    i=h.index('<ul class="diff">'); j=h.index('</ul>',i)
    h=h[:i]+'''<ul class="diff">
        <li><b class="ok">표정</b><span>LED 표정 7종(기본 · 웃음 · 놀람 · 윙크 · 하트 · 졸림 · 로딩)과 자동 눈 깜빡임.</span></li>
        <li><b class="ok">동작</b><span>대기 · 인사 · 걷기 · 점프 · 환호 5개 클립. 같은 클립이 GLB 파일 안에 들어 있어 Blender · Unity · 웹에서 그대로 재생돼요. 망토와 안테나도 함께 흔들려요.</span></li>
        <li><b class="ok">망토</b><span>천 시뮬레이션으로 목 뒤에서 주름이 잡히며 자연스럽게 늘어져요. 두께 · 둥근 밑단 · 안감 색, 몸과 최소 2.4cm(모델 기준) 간격.</span></li>
        <li><b class="ok">디테일</b><span>바이저 둘레 홈 · 헬멧 이음선 · 이어팟 홈, 납작한 발 밑창 · 끝이 살짝 가는 팔 · 배 볼륨, 볼록한 3D 빨간 Eduino와 탭 테두리, 무광 비닐 표면 결.</span></li>
        <li><b class="ok">이음새 · 명암</b><span>몸 · 팔 · 다리가 한 덩어리로 매끈하게 이어지고, 오목한 곳에 형상 그림자를 굽었어요. 실루엣 일치율 90%.</span></li>
        <li><b class="ok">산출물</b><span>경로 추적(사진식) 렌더 · 360° 회전 영상 · 설정 시트(mm 치수) · 색 분리 프린트 부품 11종 + 받침대 · 키링 · AR(iOS/안드로이드) 파일은 대화창으로 보내 드려요.</span></li>
      '''+h[j:]
    h=h.replace('<p class="files">GLB(Blender · 웹용) · STL · OBJ(키 100mm, 피규어 출력 · CAD 불러오기용) · 렌더 이미지는 대화창으로 보내 드려요.</p>','<p class="files">GLB(애니메이션 5종 내장) · 경량 GLB · AR(USDZ · GLB) · 프린트 STL(100mm · 받침대 · 키링 40mm · 색 분리) 은 대화창으로 보내 드려요.</p>')
elif which=='astro':
    cfg={'id':'astro','studio':{'exposure':1.06},
         'cam':{'orig':[-0.14,0.05,2.47,0.49],'front':[0,0.05,2.47,0.49],'three':[0.75,0.12,2.47,0.49],'side':[1.57,0.05,2.47,0.49],'back':[3.14,0.1,2.47,0.49],'face':[0.08,0.02,1.15,0.63]},
         'parts':{'glass':['Glass','GlassHL','GlassHL2','GlassHL3'],'pods':['EarPod_L','EarPod_R'],'helmet':['HelmetShell','HelmetInner','HelmetRim','Gasket','Glass','GlassHL','GlassHL2','GlassHL3'],'cape':['Cape']},
         'variants':[{'key':'orig','label':'원본 그대로','opts':{}}]}
    orig='n02_astro.jpg'
    R=[('<title>바이저 로봇 3D</title>','<title>꼬마 우주인 3D</title>'),
       ('--sky1:#f6e7b6; --sky2:#ebd494;','--sky1:#d3e5f0; --sky2:#a8c5d8;'),
       ('<div class="eyebrow"><i></i>Eduino · 컨셉 01</div>','<div class="eyebrow"><i></i>Eduino · 컨셉 02 · 투표 1위</div>'),
       ('<h1>바이저 로봇<small>01 · 3D 모델</small></h1>','<h1>꼬마 우주인<small>02 · 3D 모델</small></h1>'),
       ('<p class="lede">01번 AI 이미지를 원본과 실루엣 일치율 90%까지 맞춰 옮긴 3D 모델입니다.','<p class="lede">02번 AI 이미지를 원본과 실루엣 일치율 83%까지 맞춰 옮긴 3D 모델입니다.'),
       ('aria-label="바이저 로봇 3D 모델.','aria-label="꼬마 우주인 3D 모델.'),
       ('alt="01 바이저 로봇 원본 AI 이미지"','alt="02 꼬마 우주인 원본 AI 이미지"'),
       ('<div class="card"><h3>변형안</h3><div class="chips" id="variant"></div></div>',''),
       ('<h3>LED 표정</h3>','<h3>표정</h3>'),
       ('동작 · 부품 · 변형안을 바꿔 가며','동작 · 표정 · 부품을 바꿔 가며'),
       ('<button data-p="visor" aria-pressed="true">바이저</button><button data-p="pods" aria-pressed="true">이어팟</button><button data-p="helmet" aria-pressed="true">헬멧</button><button data-p="cape" aria-pressed="true">망토</button>','<button data-p="glass" aria-pressed="true">유리</button><button data-p="pods" aria-pressed="true">이어팟</button><button data-p="helmet" aria-pressed="true">헬멧</button><button data-p="cape" aria-pressed="true">망토</button>'),
      ]
    for a,b in R:
        assert a in h, a
        h=h.replace(a,b)
    i=h.index('<div class="sw">'); j=h.index('</div></div>',i)
    h=h[:i]+'<div class="sw"><div><i style="background:#e8921c"></i>헬멧 E8921C</div><div><i style="background:#f3f3f2"></i>얼굴 F3F3F2</div><div><i style="background:#f6f6f4"></i>우주복 F6F6F4</div><div><i style="background:#cc4038"></i>망토 CC4038</div><div><i style="background:#e8604f"></i>목링 E8604F</div><div><i style="background:#e65a68"></i>e E65A68</div>'+h[j:]
    i=h.index('<pre class="tree" aria-label="관절 구조">'); j=h.index('</pre>',i)
    h=h[:i]+"""<pre class="tree" aria-label="관절 구조">Astro
├─ Cape (천 시뮬 · 스킨)
└─ Hips
   ├─ Leg_L · Leg_R
   └─ Spine
      ├─ Suit · Belt · Collar · Sticker(Eduino)
      ├─ Cape_Root ─ Cape_Mid ─ Cape_Low
      ├─ Arm_R ─ Hand_R   (팔 LED)
      ├─ Arm_L ─ Elbow_L ─ Hand_L
      └─ Head
         ├─ Helmet  Shell · Inner · Rim · Glass
         ├─ EarPod_L · EarPod_R
         ├─ Face  표정 7종 · 볼
         └─ Antenna  e"""+h[j:]
    i=h.index('<ul class="diff">'); j=h.index('</ul>',i)
    h=h[:i]+"""<ul class="diff">
        <li><b class="ok">표정</b><span>마시멜로 얼굴 위 검은 비닐 눈 · 입으로 표정 7종(기본 · 웃음 · 놀람 · 윙크 · 하트 · 졸림 · 로딩)과 자동 눈 깜빡임.</span></li>
        <li><b class="ok">동작</b><span>대기 · 인사 · 걷기 · 점프 · 환호 5개 클립(GLB 내장). 기본 자세는 원본처럼 손을 흔들고, 동작은 팔을 내린 중립 자세에서 시작해요. 팔꿈치도 따로 접혀요.</span></li>
        <li><b class="ok">망토</b><span>원통을 휜 망토 대신 천 시뮬레이션으로 다시 만들었어요. 목 뒤에서 주름이 잡히고 밑단이 원본처럼 살짝 퍼지며, 몸 · 팔과 최소 2cm(모델 기준) 떨어져 닿지 않아요.</span></li>
        <li><b class="ok">명암</b><span>목링 아래 · 헬멧 안쪽 · 겨드랑이 · 다리 사이 · 망토 안쪽에 형상 기반 그림자를 굽었어요.</span></li>
        <li><b class="ok">맞춤</b><span>실루엣 일치율 83% — 이전 원통 망토(84%)보다 0.7%p 낮지만 뒤 · 옆에서 훨씬 자연스러워요.</span></li>
        <li><b class="ok">산출물</b><span>경로 추적(사진식) 렌더 · 360° 회전 영상 · 설정 시트(mm 치수) · 색 분리 프린트 부품 12종 + 받침대 · 키링 · AR(iOS/안드로이드) 파일은 대화창으로 보내 드려요.</span></li>
        <li><b class="todo">남은 차이</b><span>원본 특유의 아주 부드러운 그림자 번짐은 실시간 3D의 한계라, 같은 모델을 경로 추적으로 렌더한 이미지에서 확인해 주세요.</span></li>
      """+h[j:]
    h=h.replace('<p class="files">GLB(Blender · 웹용) · STL · OBJ(키 100mm, 피규어 출력 · CAD 불러오기용) · 렌더 이미지는 대화창으로 보내 드려요.</p>','<p class="files">GLB(애니메이션 5종 내장) · AR(USDZ · GLB) · 프린트 STL(100mm · 받침대 · 키링 40mm · 색 분리) 은 대화창으로 보내 드려요.</p>')
else:
    raise SystemExit('unknown')
img='data:image/jpeg;base64,'+base64.b64encode(open(d+'../concept/'+orig,'rb').read()).decode()
viewer=open(d+'viewer2-script.js').read()
h=h.replace('__MODEL__',lib).replace('__CFGJS__','window.__CFG = '+json.dumps(cfg,ensure_ascii=False)+';\nwindow.__ORIG = "'+img+'";').replace('__VIEWER__',viewer)
out={'visor':'visor-robot.html','astro':'kkoma-astronaut.html'}[which]
open(d+out,'w').write(h); print('ok', len(h))
