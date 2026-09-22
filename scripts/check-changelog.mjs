import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const base=process.argv[2];
if(!base) throw Error('Pass the pull request base SHA.');
const changed=execFileSync('git',['diff','--name-only',`${base}...HEAD`],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
if(!changed.includes('CHANGELOG.md')) {
  console.error('Every pull request must update CHANGELOG.md under Unreleased.');
  process.exit(1);
}
const changelog=fs.readFileSync('CHANGELOG.md','utf8');
const unreleased=changelog.match(/## Unreleased([\s\S]*?)(?=\n## |$)/)?.[1]||'';
if(!/^### (Added|Changed|Fixed|Removed|Planned)$/m.test(unreleased)||!/^- .+/m.test(unreleased)) {
  console.error('CHANGELOG.md needs a categorized entry under Unreleased.');
  process.exit(1);
}
console.log('Changelog requirement satisfied.');

