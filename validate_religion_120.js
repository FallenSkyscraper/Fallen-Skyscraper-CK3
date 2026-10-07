const fs = require('fs');
const path = require('path');

const game = process.env.CK3_GAME_DIR || 'D:/SteamLibrary/steamapps/common/Crusader Kings III/game';
const vanilla = path.join(game, 'common', 'religion');
const mod = 'Falen/common/religion';

if (!fs.existsSync(vanilla)) {
  throw new Error(`CK3 1.20 data not found: ${vanilla}. Set CK3_GAME_DIR to the game directory.`);
}

function keys(dir) {
  const result = new Set();
  if (!fs.existsSync(dir)) return result;
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.txt'))) {
    const source = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^\uFEFF/, '');
    for (const match of source.matchAll(/^([A-Za-z0-9_]+)\s*=\s*\{/gm)) {
      if (result.has(match[1])) throw new Error(`Duplicate key ${match[1]} in ${dir}`);
      result.add(match[1]);
    }
  }
  return result;
}
function combined(kind) {
  return new Set([...keys(path.join(vanilla, kind)), ...keys(path.join(mod, kind))]);
}
function definitions(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const starts = [...source.matchAll(/^([A-Za-z0-9_]+)\s*=\s*\{/gm)];
  return starts.map((match, index) => ({
    key: match[1],
    body: source.slice(match.index, starts[index + 1]?.index ?? source.length),
  }));
}
function list(body, key) {
  const match = body.match(new RegExp(`\\b${key}\\s*=\\s*\\{([^}]*)\\}`));
  return match ? match[1].replace(/#[^\r\n]*/g, '').trim().split(/\s+/).filter(Boolean) : [];
}
function field(body, key) {
  return body.match(new RegExp(`\\b${key}\\s*=\\s*([A-Za-z0-9_]+)`))?.[1];
}

const religions = keys(path.join(mod, 'religion_types'));
const faiths = definitions(path.join(mod, 'faith_types', 'fs_faiths.txt'));
const rites = definitions(path.join(mod, 'rite_types', 'fs_rites.txt'));
const faithKeys = new Set(faiths.map(entry => entry.key));
const riteKeys = new Set(rites.map(entry => entry.key));
const tenets = combined('tenet_types');
const doctrines = combined('doctrine_types');
const doctrineGroups = combined('doctrine_group_types');
const sites = combined('holy_site_types');
const errors = [];
const inventory = JSON.parse(fs.readFileSync('docs/religion-1.19-inventory.json', 'utf8'));

for (const name of fs.readdirSync(path.join(mod, 'religion_types')).filter(name => name.endsWith('.txt'))) {
  for (const religion of definitions(path.join(mod, 'religion_types', name))) {
    for (const match of religion.body.matchAll(/^\s*doctrine\s*=\s*([A-Za-z0-9_]+)/gm)) {
      if (!doctrines.has(match[1])) errors.push(`religion ${religion.key}: missing doctrine ${match[1]}`);
    }
  }
}
for (const kind of ['doctrine_types', 'tenet_types']) {
  for (const name of fs.readdirSync(path.join(mod, kind)).filter(name => name.endsWith('.txt'))) {
    for (const entry of definitions(path.join(mod, kind, name))) {
      if (kind === 'doctrine_types') {
        const group = field(entry.body, 'doctrine_group_type');
        if (!doctrineGroups.has(group)) errors.push(`doctrine ${entry.key}: missing group ${group}`);
      }
      for (const block of entry.body.matchAll(/(?:^|\n)\s*parameters\s*=\s*\{([^{}]*)\}/g)) {
        if (/=/.test(block[1])) errors.push(`${kind} ${entry.key}: obsolete parameter assignment`);
      }
    }
  }
}

for (const faith of faiths) {
  const religion = field(faith.body, 'religion');
  const mainRite = field(faith.body, 'main_rite');
  if (!religions.has(religion)) errors.push(`faith ${faith.key}: missing religion ${religion}`);
  if (!riteKeys.has(mainRite)) errors.push(`faith ${faith.key}: missing main rite ${mainRite}`);
  const eminentSites = list(faith.body, 'eminent_holy_sites');
  const holySites = list(faith.body, 'holy_sites');
  const allSites = [...eminentSites, ...holySites];
  for (const site of allSites) {
    if (!sites.has(site)) errors.push(`faith ${faith.key}: missing holy site ${site}`);
  }
  if (new Set(allSites).size !== allSites.length) errors.push(`faith ${faith.key}: duplicate holy site`);
  if (allSites.length > 9) errors.push(`faith ${faith.key}: too many holy sites`);
  if (eminentSites.length > 3) errors.push(`faith ${faith.key}: too many eminent holy sites`);
}
for (const rite of rites) {
  const faith = field(rite.body, 'faith');
  if (!faithKeys.has(faith)) errors.push(`rite ${rite.key}: missing faith ${faith}`);
  for (const tenet of list(rite.body, 'tenets')) {
    if (!tenets.has(tenet)) errors.push(`rite ${rite.key}: missing tenet ${tenet}`);
  }
  for (const match of rite.body.matchAll(/^\s*(?:tenet|fallback_tenet)\s*=\s*(tenet_[A-Za-z0-9_]+)/gm)) {
    if (!tenets.has(match[1])) errors.push(`rite ${rite.key}: missing conditional tenet ${match[1]}`);
  }
  for (const doctrine of list(rite.body, 'doctrines')) {
    if (!doctrines.has(doctrine)) errors.push(`rite ${rite.key}: missing doctrine ${doctrine}`);
  }
}
for (const originalReligion of inventory) {
  if (!religions.has(originalReligion.religion)) {
    errors.push(`original religion ${originalReligion.religion}: missing`);
  }
  for (const originalFaith of originalReligion.faiths) {
    const rite = rites.find(entry => entry.key === originalFaith.key);
    if (!rite) {
      errors.push(`original faith ${originalFaith.key}: missing rite`);
      continue;
    }
    const faith = faiths.find(entry => entry.key === field(rite.body, 'faith'));
    if (!faith) continue;
    const parentSites = new Set([...list(faith.body, 'eminent_holy_sites'), ...list(faith.body, 'holy_sites')]);
    for (const site of originalFaith.holySites) {
      if (!parentSites.has(site)) errors.push(`original faith ${originalFaith.key}: lost holy site ${site}`);
    }
    const riteTenets = new Set(list(rite.body, 'tenets'));
    for (const tenet of originalFaith.tenets) {
      if (tenet !== 'tenet_monasticism' && !riteTenets.has(tenet)) {
        errors.push(`original faith ${originalFaith.key}: lost tenet ${tenet}`);
      }
    }
    for (const doctrine of originalFaith.doctrines) {
      if (!list(rite.body, 'doctrines').includes(doctrine)) {
        errors.push(`original faith ${originalFaith.key}: lost doctrine ${doctrine}`);
      }
    }
    for (const choice of originalFaith.conditionalTenets) {
      if (!rite.body.includes(`requires_dlc_flag = ${choice.dlc}`) ||
          !rite.body.includes(`tenet = ${choice.tenet}`) ||
          !rite.body.includes(`fallback_tenet = ${choice.fallback}`)) {
        errors.push(`original faith ${originalFaith.key}: lost conditional tenet ${choice.tenet}`);
      }
    }
  }
}
for (const faith of faiths) {
  const mainRite = rites.find(rite => rite.key === field(faith.body, 'main_rite'));
  if (mainRite && field(mainRite.body, 'faith') !== faith.key) {
    errors.push(`faith ${faith.key}: main rite belongs to ${field(mainRite.body, 'faith')}`);
  }
}
for (const dir of ['characters', 'provinces']) {
  const base = path.join('Falen', 'history', dir);
  for (const name of fs.readdirSync(base).filter(name => name.endsWith('.txt'))) {
    const source = fs.readFileSync(path.join(base, name), 'utf8');
    for (const match of source.matchAll(/^\s*rite\s*=\s*"?([A-Za-z0-9_]+)"?/gm)) {
      if (!riteKeys.has(match[1])) errors.push(`${dir}/${name}: missing rite ${match[1]}`);
    }
  }
}
console.log(`${religions.size} religions, ${faiths.length} faiths, ${rites.length} rites; ${errors.length} errors`);
for (const error of errors) console.error(error);
if (errors.length) process.exitCode = 1;
