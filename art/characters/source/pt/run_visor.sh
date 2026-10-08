#!/bin/bash
cd /tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/pw
timeout 600 node ptscene.mjs ../pt/v_hero '{"id":"visor","expr":"기본"}' && (cd ../pt && timeout 3000 node trace.mjs v_hero out_v_hero.png "$(cat cfg_v_hero.json)" > log_v_hero.txt 2>&1)
timeout 600 node ptscene.mjs ../pt/v_wave '{"id":"visor","expr":"하트","clip":"인사","t":0.25}' && (cd ../pt && timeout 3000 node trace.mjs v_wave out_v_wave.png "$(cat cfg_v_wave.json)" > log_v_wave.txt 2>&1)
timeout 600 node ptscene.mjs ../pt/v_jump '{"id":"visor","expr":"웃음","clip":"점프","t":0.5}' && (cd ../pt && timeout 3000 node trace.mjs v_jump out_v_jump.png "$(cat cfg_v_jump.json)" > log_v_jump.txt 2>&1)
timeout 600 node ptscene.mjs ../pt/v_back '{"id":"visor","expr":"기본","clip":"걷기","t":0.3}' && (cd ../pt && timeout 3000 node trace.mjs v_back out_v_back.png "$(cat cfg_v_back.json)" > log_v_back.txt 2>&1)
echo ALLDONE > done_visor.txt
