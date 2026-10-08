#!/bin/bash
cd /tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/pt
while [ ! -f ../pw/done_astro.txt ] && [ ! -f done_astro.txt ]; do sleep 20; done
cd ../pw
timeout 600 node ptscene.mjs ../pt/v_back '{"id":"visor","expr":"기본","clip":"걷기","t":0.3,"rotY":-2.6}' && (cd ../pt && timeout 4000 node trace.mjs v_back out_v_back.png "$(cat cfg_v_back2.json)" > log_v_back.txt 2>&1)
timeout 600 node ptscene.mjs ../pt/a_back '{"id":"astro","expr":"기본","clip":"걷기","t":0.3,"rotY":-2.6}' && (cd ../pt && timeout 4000 node trace.mjs a_back out_a_back.png "$(cat cfg_a_back.json)" > log_a_back.txt 2>&1)
echo ALLDONE > done_back.txt
