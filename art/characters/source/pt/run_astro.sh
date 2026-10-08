#!/bin/bash
cd /tmp/claude-0/-home-user-Playino/21106cdd-724f-594b-ad21-d623ecc271d7/scratchpad/pt
while [ ! -f done_visor.txt ]; do sleep 20; done
cd ../pw
timeout 600 node ptscene.mjs ../pt/a_hero '{"id":"astro","expr":"기본"}' && (cd ../pt && timeout 4000 node trace.mjs a_hero out_a_hero.png "$(cat cfg_a_hero.json)" > log_a_hero.txt 2>&1)
timeout 600 node ptscene.mjs ../pt/a_wave '{"id":"astro","expr":"하트","clip":"인사","t":0.25}' && (cd ../pt && timeout 4000 node trace.mjs a_wave out_a_wave.png "$(cat cfg_a_wave.json)" > log_a_wave.txt 2>&1)
timeout 600 node ptscene.mjs ../pt/a_jump '{"id":"astro","expr":"웃음","clip":"점프","t":0.5}' && (cd ../pt && timeout 4000 node trace.mjs a_jump out_a_jump.png "$(cat cfg_a_jump.json)" > log_a_jump.txt 2>&1)
echo ALLDONE > done_astro.txt
