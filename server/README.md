# 모둠 협동 방 서버

'붉은 행성 대탈출' 모둠 협동(최대 5명)을 여러 기기에서 하려면 이 서버가 하나 필요하다.
브라우저는 보안 때문에 같은 와이파이의 다른 컴퓨터를 직접 찾지 못한다 — 학생 화면끼리 이어 주는 **중계**만 한다.

- 게임 계산은 하지 않는다: 각자 자기 에디를 움직이고, 협동 장치(발판 · 다리 · 시소 · 상자)는 **방장 화면**이 계산해 알린다.
- 방 규칙(4자리 코드 · 5명 · 방장 이어받기)은 앱과 같은 `src/net/roomCore.js` 를 그대로 쓴다.
- 저장하는 것 없음(DB 없음). 방은 모두 나가면 사라진다. 메모리 · CPU 를 거의 안 쓴다(t3.micro 로 충분).

## 로컬에서 띄우기

```bash
cd server
npm install
npm start                      # → ws://localhost:8787  (상태: http://localhost:8787/health)
```

게임에서 이 서버를 쓰려면 주소창에 `?room=ws://localhost:8787` 을 붙이거나, 빌드할 때 `VITE_ROOM_URL` 을 넣는다.
서버 주소가 없으면 게임은 **창끼리 모드**(같은 컴퓨터의 창 · 탭끼리만, 시범 · 점검용)로 움직인다.

## AWS(EC2)에 올리기

게임은 `https://` 로 배포되므로 방 서버도 **`wss://`(TLS)** 여야 한다(브라우저가 섞인 연결을 막는다).
아래는 Ubuntu EC2 + nginx + Let's Encrypt 예시. 도메인 예: `room.example.com`.

1. **서버 준비** — Node 18 이상, 저장소 받기

   ```bash
   sudo apt update && sudo apt install -y nginx
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
   git clone <저장소 주소> eduino && cd eduino/server && npm install --omit=dev
   ```

2. **상시 실행(systemd)** — `/etc/systemd/system/eduino-room.service`

   ```ini
   [Unit]
   Description=Eduino room server
   After=network.target

   [Service]
   WorkingDirectory=/home/ubuntu/eduino/server
   ExecStart=/usr/bin/node room-server.mjs
   Environment=PORT=8787
   Environment=ALLOWED_ORIGINS=https://게임주소.vercel.app
   Restart=always
   User=ubuntu

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload && sudo systemctl enable --now eduino-room
   curl localhost:8787/health      # {"ok":true,...}
   ```

3. **nginx 로 wss 열기** — `/etc/nginx/sites-available/eduino-room` (`sites-enabled` 에 링크)

   ```nginx
   server {
     server_name room.example.com;
     location / {
       proxy_pass http://127.0.0.1:8787;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_read_timeout 3600s;
     }
   }
   ```

   ```bash
   sudo snap install --classic certbot && sudo certbot --nginx -d room.example.com
   sudo systemctl reload nginx
   ```

   보안 그룹: 80 · 443 만 열면 된다(8787 은 밖에 열지 않는다).

4. **게임에 주소 넣기** — Vercel 환경 변수 `VITE_ROOM_URL=wss://room.example.com` 을 넣고 다시 배포.
   (빌드 없이 시험하려면 게임 주소 뒤에 `?room=wss://room.example.com`.)

## 확인

- `https://room.example.com/health` → `{"ok":true,"rooms":0,"players":0}`
- 두 기기에서 기지 → 👥 모둠 → 한쪽 '방 만들기', 다른 쪽 코드 입력 → 대기실에 둘 다 보이면 성공.

## 안전 장치

- `ALLOWED_ORIGINS`: 게임 주소에서 온 연결만 받는다(비우면 모두 허용 — 개발용).
- 한 메시지 4KB · 학생 한 명 1초 90개까지. 이름은 8글자 · 꾸미기 값은 짧은 영문 id 만 받는다.
- 응답 없는 연결은 20초마다 정리한다.
